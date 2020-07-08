
# Pony Project
Define jobs to automate your Salesforce development experience.
Automate scratch org creation, data export/import 
and other using simple configuration file and sfdx plugin
to get rid of custom script files. 

## Project Structure
The core config file for pony projects is `.pony/config.yml`.
This file includes job definitions, source replacements and data export/import configuration.
Directories `data/` and `scripts/` contains files essential for creation of fully configure scratch orgs.
```
.
├── .pony
│   └── config.yml
├── config
│   └── project-scratch-def.json
├── data
│   ├── groups
│   │   └── package.json
│   └── sObjects
│       ├── Account.json
│       └── Contact.json
└── force-app (src)
│   └── main
│       └── default
│           ├── classes
│           └── lwc
├── sfdx-project.json
└── scripts
    ├── apex
    │   └── insertCustomSettings.apex
    └── soql
        └── export
            ├── Account.soql
            └── Contact.soql

```

## Jobs configuration
Job is a collection of steps.
You can define your own job which can be executed from another job or using `sfdx pony:run`.
Standard job extensions are prefixed with `pony`, e.g. `pony:preOrgCreate` and `pony:postSourcePush`,
these two jobs are executed before and after the `sfdx pony:org:create` command. 

There are five types of steps: 'echo', 'env', 'job', 'run' and 'sfdx'.

| type | example                           | description                   |
|------|-----------------------------------|-------------------------------|
| echo | `echo: running echo step`         | print to standard output      |
| env  | `env: myUsername=user@domain.com` | set pony environment variable |
| job  | `job: createTestUsers`            | execute job                   |
| run  | `npx eslint yourfile.js`          | execute shell                 |
| sfdx | `sfdx: force:org:list`            | shortcut for `run: sfdx`      |

In the example you can see defined three jobs and one replacement.
To create a scratch org execute `sfdx pony:org:create` command. 
Before a scratch org is created the command will look for `pony:preOrgCreate` job.
In the example there is a `pony:postOrgCreate` job which is executed after org creation.
You can see most of the steps use `-u $env.username`, this is a pony syntax for global environment.
The `username` and `devhubusername` variables are populated whenever an org is created, 
so you don't have to rely on the sfdx default username.
The first steps simply print login url (can be used in CI system to log in)
and install first gen packages defined in `data/groups/packages.json`.

The third step is more complicated. You can see that the source is pushed via `pony:source:push` 
and not through the standard `force` command.
Before a push is executed a `pony:preSourcePush` job 
which runs `sfdx: pony:source:content:replace -r preSourcePush` command.
The `preSourcePush` is a name of a replacement and is defined right after jobs.
You can use replacements as a workaround for example when your source includes usernames 
that are not replaced automatically with admin username by `force:source:push`.
This replacement looks for inner texts in specified XML source files.
It searches for the specified search texts and replaces them with admin username using pony environment.
After the source is pushed, the content of these files is reverted.
Moreover, if the push is successful, 
the source path infos hashes are updated, so the files are not pushed again.
Now you can use the standard `force:source:push` command.
Note that you will again need to use the `pony:source:push` if you modify these files locally.

Next you can insert custom settings if any, import currency, import data 
(more about export/import in Data Management chapter), create test users and many others.

```yaml
jobs:
    pony:postOrgCreate:
        steps:
            -   sfdx: force:org:open -u $env.username --urlonly
            -   sfdx: pony:package:group:install -u $env.username
            -   sfdx: pony:source:push -u $env.username
            -   sfdx: force:apex:execute -u $env.username -f scripts/apex/insertCustomSettings.apex
            -   sfdx: force:data:tree:import -u $env.username -f data/CurrencyType.json
            -   sfdx: pony:data:import -u $env.username
            -   job: createTestUsers
            -   sfdx: force:org:list
    pony:preSourcePush:
        steps:
            -   sfdx: pony:source:content:replace -r preSourcePush
    createTestUsers:
        steps:
            -   sfdx: pony:user:create -u $env.username -f config/test-user-definition-file.json -p agent LastName=Agent ProfileName=Agent IsActive=false
            -   sfdx: pony:user:create -u $env.username -f config/test-user-definition-file.json -p std LastName=Standard ProfileName="Standard User" IsActive=false

replacements:
    preSourcePush:
        innerText:
            files:
                - force-app/main/default/approvalProcesses/Opportunity.Opportunity_Approval_Process.approvalProcess-meta.xml
                - force-app/main/default/approvalProcesses/Contract.Contract_Approval_Process.approvalProcess-meta.xml
            search:
                - some@username.com
                - another@username.com
            replacement: $env.username
```


## Data Management
The `force:data:tree` is a great tool if you want to export/import records
that can be queried using single query.
This command is often not sufficient 
when the relationships between your records are more complicated.
For this purpose we bring you two commands, 
`pony:data:export` and `pony:data:import`,
which can handle import in a sequence.


### Data Export
To export data you will need soql files defining which records to exports.
These files should be in directory `scripts/soql/export/`
and can optionally be overridden using `soqlExportDir` option in the data export config.
You can specify which sObjects to export using `order` option in the data export config, 
default value is `reverseOrder` which reverses the import order.

To create base soql with all createable fields automatically 
use `pony:data:soql:query:create` command.
Now you can export records from configured org, e.g. sandbox or production,
using `sfdx pony:data:export`.
Exported records are by default in `data/sObjects/` 
and can be overridden using `recordsDir` option in the sObjects config. 

        
### Data Import
To import records, you will need at least the exported records and defined import order.
Look at the `relationships` in the example bellow. 
You can see that for some sObjects we have defined some relationship fields.
For the Contact sObjects we are declaring to populate their `AccountId` fields
from accounts matched by `Name` fields.
There are two key things to bear in mind, accounts must be imported before contacts 
(`Account` must precede `Contact` in import order) 
and `Account.Name` field should be unique and required.

All records of a specific type are deleted before import in reversed import order.
You can turn off this feature, set `deleteBeforeImport` to `false` in the data import config,
other option is to list specific sObject types.
To delete only some records of specific type, create soql file in the `scripts/soql/delete`,
this directory can be changed using `soqlDeleteDir` option also in the data import config.

By default, records are inserted in chunks of 200, this can be changed using `chunkSize` option.

Basic data configuration shown bellow.

```yaml
data:
    sObjects:
        import:
            order:
                - Account
                - Contact
                - Pricebook2
                - Opportunity
                - Product2
                - PricebookEntry
                - OpportunityLineItem
            deleteBeforeImport:
                - Case
                - OpportunityLineItem
                - Product2
                - Opportunity
                - Pricebook2
                - Contact
                - Account
            relationships:
                Contact:
                    - Account.Name
                Opportunity:
                    - Account.Name
                    - Pricebook2.Name
                PricebookEntry:
                    - Pricebook2.Name
                    - Product2.Name
                OpportunityLineItem:
                    - Product2.Name
                    - Opportunity.Name
```