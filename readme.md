**CLI tool for synchronization of SFCC .properties files in i18n bundles**

Description: tool that synchronizes translation lines in each file of any bundle. After processing each file will have common structure:
- all translation lines are alphabetically sorted;
- line with string code that is not present in all files will be added to the missing files (with empty translation string, or commented out if **commentEmptyTranslations** option is used);

Note: currently .properties files are edited in-place. It's recommended to copy the "resources" directory from project to the tool directory for processing (usage examples assume that);

CLI options:
<p><b>path</b> - <b>mandatory</b> - path to the "resources" directory;</p>
<p><b>autoAddNamespaces</b> - adds "#namespace={namespace}" before each new translation code namespace.
<br/>
Ex: if translation string is <b>"aaa.bbb.ccc=ddd"</b>
<br/>
then namespace for it will be <b>"aaa.bbb"</b>
<br/>
and namespace comment line <b>"#namespace=aaa.bbb"</b> will be added.
</p>
<p><b>useLooseNamespacedComments</b> - comments that begin with "##" will be considered namespace comments</p>
<p><b>removeAllComments</b> - removes all comments from i18n bundles. Only comments that are already present will be removed i.e. this option can be used with <b>autoAddNamespaces</b>.</p>
<p><b>commentEmptyTranslations</b> - if for any locale the translation string appears empty- adds that string code as a comment:
<br/>
if string is <b>"aaa.bbb="</b>
<br/>
it will become <b>"#aaa.bbb="</b></p>
<p>
    <b>namespacedCommentFlag</b> - comment line in format <b>"#{namespacedCommentFlag}=aaa.bbb.ccc"</b> will be considered
    as start of namespaced comment. This comment will always appear at the start
    of <b>"aaa.bbb.ccc"</b> namespace of translation string codes
    Note that only one namespaced comment could be present and it MUST be defined in "default" bundle file.
    Also note that if <b>removeAllComments</b> option is used then all namespace comments are re-created from scratch.
    This means you will loose all your custom comments added.
</p>

<p>
    Common refactoring strategy is:
    <ul>
        <li>
            Run
            <br/>
            <b>node sync_properties.js --path=./resources --removeAllComments=true --autoAddNamespaces=true --commentEmptyTranslations=true</b>
        </li>
        <li>
            (Optionally) Add specific namespaced comments in "default" bundle file ex:
            <br/>
            <br/>
            was:
            <br/>
            <b>#namespace=aaa.bbb</b>
            <br/>
            <br/>
            You need to add a comment so it would become:
            <br/>
            <b>#namespace=aaa.bbb</b>
            <br/>
            <b>#specific namespaced comment text here</b>
        </li>
        <li>
            (Optionally) Run
            <br/>
            <b>node sync_properties.js --commentEmptyTranslations=true</b>
            <br/>
            to extend added comments to all translation files in a bundle
        </li>
    </ul>
</p>

**Usage examples:**
<p>node sync_properties.js --path=./resources --removeAllComments=true --autoAddNamespaces=true --commentEmptyTranslations=true</p>
<p>node sync_properties.js --path=./resources --useLooseNamespacedComments=true --removeAllComments=true --autoAddNamespaces=true</p>
<p>node sync_properties.js --path=./resources --removeAllComments=true</p>

Note: still should be considered alpha, thought tested on real project. Feel free to contribute:).