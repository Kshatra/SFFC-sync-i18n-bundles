/*
Usage examples:
node sync_properties.js --path=./resources --removeAllComments=true --autoAddNamespaces=true --commentEmptyTranslations=true
node sync_properties.js --path=./resources --useLooseNamespacedComments=true --removeAllComments=true --autoAddNamespaces=true
node sync_properties.js --path=./resources --removeAllComments=true
 */

// TODO: Feel free to refactor code, add plugin/middleware support

const
    argv = require('yargs').argv,
    FileHound = require('filehound'),
    fs = require('fs'),
    readline = require('readline'),
    path = require('path');

const config = {
    i18nBundlesPath: argv.path,
    // comments that begin with "##" will be considered a namespace comments
    useLooseNamespacedComments: argv.useLooseNamespacedComments,
    // removes all comments from i18n bundles
    removeAllComments: argv.removeAllComments,
    // adds "#namespace={namespace}" before each new translation code namespace
    // IE for if translation string is "aaa.bbb.ccc=ddd"
    // then namespace for it will be "aaa.bbb"
    // and namespace comment line "#namespace=aaa.bbb" will be added.
    autoAddNamespaces: argv.autoAddNamespaces,
    // if for any locale the translation string appears empty- adds that string code as a comment
    // if string is "aaa.bbb="
    // it will become "#aaa.bbb="
    commentEmptyTranslations: argv.commentEmptyTranslations,
    // first occurance of this symbol in file name separates bundle prefix part from locale part
    bundlePrefixSeparator: argv.commentEmptyTranslations || '_',
    // comment line in format "#{namespacedCommentFlag}=aaa.bbb.ccc" will be considered
    // as start of namespaced comment. This comment will always appear at the start
    // of "aaa.bbb.ccc" namespace of translation string codes
    // Note that only one namespaced comment could be present
    namespacedCommentFlag: argv.commentEmptyTranslations || 'namespace'
};

if (!config.i18nBundlesPath) {
    console.log('No "path" argument');
    return;
}

function alphaBeticCompare(a, b) {
    if(a < b) return -1;
    if(a > b) return 1;
    return 0;
}

function getLocaleCode(fileName) {
    let currentLocaleCode = path.parse(fileName).name.split('_');
    currentLocaleCode.splice(0, 1);
    return currentLocaleCode.join('_') || 'default';
}

function syncBundle(bundleName) {
    const i18nMatrix = {},
        namespacedComments = {},
        simpleComments = {},
        stringCodesSet = new Set();

    FileHound.create()
        .paths(config.i18nBundlesPath)
        .ext('properties')
        .match(bundleName+'*')
        .find()
        .then(function (bundleFilesList) {
            bundleFilesList.forEach(function (fileName) {
                let currentLocaleCode = getLocaleCode(fileName),
                    commentBuffer = [],
                    commentType = 'none',
                    commentNamespace = 'none';

                if (!i18nMatrix[currentLocaleCode]) {
                    i18nMatrix[currentLocaleCode] = {}
                }

                var lines = fs.readFileSync(fileName).toString().replace(/\r\n/g,'\n').split("\n");
                for(const lineIndex in lines) {
                    const lineValue = lines[lineIndex].trim(),
                        separatorIndex = lineValue.indexOf('='),
                        stringCode = lineValue.substring(0, separatorIndex),
                        stringValue = lineValue.substring(separatorIndex + 1);

                    if (lineValue.indexOf('#') === 0) {
                        // skipping comments processing
                        if (!config.removeAllComments) {
                            // process comment line
                            if (commentType === 'none') {
                                if (lineValue.indexOf(`#${config.namespacedCommentFlag}=`) === 0) {
                                    commentType = 'namespaced';
                                    commentNamespace = lineValue.split('=')[1];
                                } else if (config.useLooseNamespacedComments && lineValue.indexOf('##') === 0) {
                                    // comment namespace in this case will be defined by first line that is not a comment
                                    commentType = 'namespaced';
                                } else {
                                    commentType = 'simple';
                                }
                            }
                            commentBuffer.push(lineValue);
                            continue;
                        }
                    } else if (lineValue.indexOf('=') === -1) {
                        // exclude "garbage" lines that are nor comment nor translation
                        continue;
                    } else {
                        // add comment to comments dictionary only from "default" locale file
                        if (currentLocaleCode === 'default' && commentType !== 'none') {
                            if (commentType === 'simple') {
                                if (!simpleComments[stringCode]) {
                                    simpleComments[stringCode] = commentBuffer.join('\n');
                                } else {
                                    console.warn(`Duplicated simple comment for string code"${stringCode}" found: only the first comment will be used`);
                                }
                            } else {
                                // namespaced comment
                                const stringNamespace = stringCode.substring(0, stringCode.lastIndexOf('.'));

                                if (config.useLooseNamespacedComments && commentNamespace == 'none') {
                                    commentNamespace = stringNamespace;
                                }

                                if (!namespacedComments[commentNamespace]) {
                                    namespacedComments[commentNamespace] = commentBuffer.join('\n');
                                } else {
                                    console.warn(`Duplicated namespaced comment for namespace"${stringCode}" found: only the first comment will be used`);
                                }
                            }

                            commentBuffer = [];
                            commentType = 'none';
                            commentNamespace = 'none';
                        }

                        // add translation line data to matrix
                        stringCodesSet.add(stringCode);
                        i18nMatrix[currentLocaleCode][stringCode] = stringValue;
                    }
                }
            });

            return bundleFilesList;
        })
        .then(function (bundleFilesList) {

            const stringCodesSortedList = Array.from(stringCodesSet).sort((a, b) => {
                const namespaceA = a.substring(0, a.lastIndexOf('.')),
                    namespaceB = b.substring(0, b.lastIndexOf('.'));

                return alphaBeticCompare(namespaceA, namespaceB);
            });
            let namespaceStartFlag;

            // console.log('simpleComments', simpleComments);
            // console.log('namespacedComments', namespacedComments);

            bundleFilesList.forEach(function (fileName) {
                let currentLocaleCode = getLocaleCode(fileName),
                    syncedFileContent = stringCodesSortedList.map(function (stringCode) {
                        let resultStr = '',
                            comment = '';

                        const namespace = stringCode.substring(0, stringCode.lastIndexOf('.')),
                            namespacedComment = namespacedComments[namespace] || (config.autoAddNamespaces && `#${config.namespacedCommentFlag}=${namespace}`),
                            simpleComment = simpleComments[stringCode],
                            stringValue = i18nMatrix[currentLocaleCode][stringCode];

                        let localeString = [stringCode, stringValue].join('=');
                        if (config.commentEmptyTranslations && !stringValue) {
                            localeString = '#' + localeString;
                        }

                        if (namespaceStartFlag !== namespace && namespacedComment) {
                            namespaceStartFlag = namespace;
                            comment = !!namespacedComment ? `\n${namespacedComment}\n` : comment;
                        }
                        // add simple comment after namespaced one
                        comment = !!simpleComment ? comment + `${simpleComment}\n` : comment;
                        resultStr = !!comment ? comment + localeString : localeString;
                        resultStr.indexOf('#') === 0 && console.log('resultStr: ', resultStr);
                        return resultStr;
                    }).join('\n');

                fs.writeFile(fileName, syncedFileContent, function(err) {
                    if(err) {
                        return console.log(err);
                    }
                    console.log('"' + fileName + '" processed successfully');
                });
            });
        });
}

// Main init
FileHound
    .create()
    .paths(config.i18nBundlesPath)
    .ext('properties')
    .find()
    .then(function(filesList) {
        const defaultBundles = filesList.filter(function (filePath) {
            return filePath.indexOf(config.bundlePrefixSeparator) == -1;
        });

        defaultBundles.forEach(function (fileName) {
            syncBundle(path.basename(fileName, '.properties'))
        })
    });