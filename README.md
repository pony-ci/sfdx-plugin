# sfdx-plugin

Pony sfdx plugin to automate your application lifecycle.

* Docs: https://pony-ci.github.io/docs
* Issues: https://github.com/pony-ci/sfdx-plugin/issues

# Usage
<!-- usage -->
```sh-session
$ npm install -g @pony-ci/sfdx-plugin
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
@pony-ci/sfdx-plugin/1.0.0 linux-x64 node-v8.10.0
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
* [`sfdx pony [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-pony---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:connectedapp:deploy -l <string> -e <string> [-s <string>] [-u <string>] [-c <string>] [-d <string>] [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponyconnectedappdeploy--l-string--e-string--s-string--u-string--c-string--d-string--p--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:data:export [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponydataexport--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:data:export:soql:query:create -s <string> [-p] [--excludeparentfields] [--includenoncreateable] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponydataexportsoqlquerycreate--s-string--p---excludeparentfields---includenoncreateable--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:data:import [--noprompt] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponydataimport---noprompt--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:group:assign -g <string> [-t AllCustomerPortal|ChannelProgramGroup|CollaborationGroup|Manager|ManagerAndSubordinatesInternal|Organization|PRMOrganization|Queue|Regular|Role|RoleAndSubordinates|RoleAndSubordinatesInternal|Territory|TerritoryAndSubordinates] [--userorgroup <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponygroupassign--g-string--t-allcustomerportalchannelprogramgroupcollaborationgroupmanagermanagerandsubordinatesinternalorganizationprmorganizationqueueregularroleroleandsubordinatesroleandsubordinatesinternalterritoryterritoryandsubordinates---userorgroup-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:org:create [name=value...] [-s] [-a <string>] [-d <integer>] [-w <number>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponyorgcreate-namevalue--s--a-string--d-integer--w-number--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:package:group:export [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponypackagegroupexport--n-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:package:group:install [-g <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponypackagegroupinstall--g-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:run [--onlyifdefined] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponyrun---onlyifdefined---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:source:content:replace -r <string> [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponysourcecontentreplace--r-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:source:push [-f] [-g] [-w <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponysourcepush--f--g--w-number--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:source:sort [-f <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponysourcesort--f-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:user:create -n <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponyusercreate--n-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:user:profile:assign -p <string> [-a <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponyuserprofileassign--p-string--a-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx pony:user:update -v <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-ponyuserupdate--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx pony [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

```
USAGE
  $ sfdx pony [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation
```

## `sfdx pony:connectedapp:deploy -l <string> -e <string> [-s <string>] [-u <string>] [-c <string>] [-d <string>] [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

create connected app

```
USAGE
  $ sfdx pony:connectedapp:deploy -l <string> -e <string> [-s <string>] [-u <string>] [-c <string>] [-d <string>] [-p] 
  [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --certificate=certificate
      path to certificate

  -d, --targetdir=targetdir
      directory for the connected app

  -e, --contactemail=contactemail
      (required) connected app contact email

  -l, --label=label
      (required) connected app label

  -p, --noprompt
      do not prompt connected app deployment

  -s, --scopes=scopes
      comma-separated OAuth scopes; valid values are Basic, Api, Web, Full, Chatter, CustomApplications, RefreshToken, 
      OpenID, Profile, Email, Address, Phone, OfflineAccess, CustomPermissions, Wave, Eclair

  -u, --callbackurl=callbackurl
      callback url

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

DESCRIPTION
  Set target directory to write the connected app.

  Example:
       sfdx pony:connectedapp:create -u myOrg -l "My CI" -s Api,Web,RefreshToken -c /path/to/cert.crt -e john@acme.com 
  -u http://localhost:1717/OauthRedirect
```

## `sfdx pony:data:export [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

```
USAGE
  $ sfdx pony:data:export [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation
```

## `sfdx pony:data:export:soql:query:create -s <string> [-p] [--excludeparentfields] [--includenoncreateable] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

create soql file for exporting records

```
USAGE
  $ sfdx pony:data:export:soql:query:create -s <string> [-p] [--excludeparentfields] [--includenoncreateable] [-u 
  <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --noprompt                                                                    no prompt to confirm overwrite

  -s, --sobjecttype=sobjecttype                                                     (required) the API name of the
                                                                                    object to create query

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --excludeparentfields                                                             by default parent field names are
                                                                                    added, e.g. "RecordType.Name"

  --includenoncreateable                                                            by default only createable fields
                                                                                    are added

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation
```

## `sfdx pony:data:import [--noprompt] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

```
USAGE
  $ sfdx pony:data:import [--noprompt] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --noprompt                                                                        Allow data import to all instances
                                                                                    without prompt.
```

## `sfdx pony:group:assign -g <string> [-t AllCustomerPortal|ChannelProgramGroup|CollaborationGroup|Manager|ManagerAndSubordinatesInternal|Organization|PRMOrganization|Queue|Regular|Role|RoleAndSubordinates|RoleAndSubordinatesInternal|Territory|TerritoryAndSubordinates] [--userorgroup <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

assign public group

```
USAGE
  $ sfdx pony:group:assign -g <string> [-t 
  AllCustomerPortal|ChannelProgramGroup|CollaborationGroup|Manager|ManagerAndSubordinatesInternal|Organization|PRMOrgani
  zation|Queue|Regular|Role|RoleAndSubordinates|RoleAndSubordinatesInternal|Territory|TerritoryAndSubordinates] 
  [--userorgroup <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -g, --group=group
      (required) developer names of the Group

  -t, 
  --type=(AllCustomerPortal|ChannelProgramGroup|CollaborationGroup|Manager|ManagerAndSubordinatesInternal|Organization|P
  RMOrganization|Queue|Regular|Role|RoleAndSubordinates|RoleAndSubordinatesInternal|Territory|TerritoryAndSubordinates)
      type of the Group

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

  --userorgroup=userorgroup
      ID of the User or Group that is a direct member of the group (default: target username)

DESCRIPTION
  This command is idempotent, which means you can run it multiple times with same result.
    
  Developer Guide:
  * https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_group.htm
  * https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_groupmember.htm
    
  Supported Group types:
  * AllCustomerPortal
  * ChannelProgramGroup
  * CollaborationGroup
  * Manager
  * ManagerAndSubordinatesInternal
  * Organization
  * PRMOrganization
  * Queue
  * Regular
  * Role
  * RoleAndSubordinates
  * RoleAndSubordinatesInternal
  * Territory
  * TerritoryAndSubordinates

EXAMPLES
  $ sfdx pony:group:assign -g My_Queue
  $ sfdx pony:group:assign -t Queue -g Fist_Queue,Second_Queue
  $ sfdx pony:group:assign -t Queue -g My_Queue --userorgroup 0053N000002EP0zQAG
```

## `sfdx pony:org:create [name=value...] [-s] [-a <string>] [-d <integer>] [-w <number>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

create a fully configured scratch org

```
USAGE
  $ sfdx pony:org:create [name=value...] [-s] [-a <string>] [-d <integer>] [-w <number>] [-v <string>] [-u <string>] 
  [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --setalias=setalias                                                           alias for the created org

  -d, --durationdays=durationdays                                                   duration of the scratch org;
                                                                                    override value in config (in days)
                                                                                    (default: config value or 7, min:1,
                                                                                    max:30)

  -s, --setdefaultusername                                                          set the created org as the default
                                                                                    username

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  -w, --wait=wait                                                                   [default: 6] the streaming client
                                                                                    socket timeout (in minutes)

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Provide key=value pairs while creating a scratch org. When creating scratch orgs, --targetdevhubusername (-v) must be 
  a Dev Hub org.
  
  No ancestors, no namespace, duration days, definition file and username generation
  options can be configured in pony config. 
  Duration days flag will override the value in config (or default value if not specified in config).
  
  Execution Flow:
       1) Set 'username' and 'devhubusername' env values if existing org is used (either targetusername flag or default 
  org).
       2) Run 'pony:preOrgCreate' job if existing org is not used.
       3) Run 'force:org:create' command and set 'username' and 'devhubusername' env values if existing org is not used.
       4) Run 'pony:postOrgCreate' job on success.
```

## `sfdx pony:package:group:export [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

export package group from configured org for scratch org creation

```
USAGE
  $ sfdx pony:package:group:export [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -n, --group=group                                                                 [default: default] name of the
                                                                                    package group

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Exported package group is an ordered list of packages that can be installed with the 'sfdx pony:package:group:install' 
  command.
```

## `sfdx pony:package:group:install [-g <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

install package group

```
USAGE
  $ sfdx pony:package:group:install [-g <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -g, --group=group                                                                 [default: default] name of the
                                                                                    package group

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  To create package group run the 'sfdx pony:package:group:export' command.
```

## `sfdx pony:run [--onlyifdefined] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

run any job defined in config

```
USAGE
  $ sfdx pony:run [--onlyifdefined] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --onlyifdefined                                                                   execute the job only if defined,
                                                                                    otherwise throw error
```

## `sfdx pony:source:content:replace -r <string> [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

replace values in xml component files

```
USAGE
  $ sfdx pony:source:content:replace -r <string> [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -r, --replacement=replacement                                                     (required) name of the replacement
  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation
```

## `sfdx pony:source:push [-f] [-g] [-w <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

push source to a scratch org from the project

```
USAGE
  $ sfdx pony:source:push [-f] [-g] [-w <number>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --forceoverwrite                                                              ignore conflict warnings and
                                                                                    overwrite changes to scratch org

  -g, --ignorewarnings                                                              deploy changes even if warnings are
                                                                                    generated

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33] wait time for command
                                                                                    to finish in minutes

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Execution Flow:
  2) Run 'pony:preSourcePush' job if existing org is not used.
  3) Run 'force:source:push' command.
  4) Run 'pony:postSourcePush' job on success.
```

## `sfdx pony:source:sort [-f <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

sort xml source files

```
USAGE
  $ sfdx pony:source:sort [-f <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --files=files                                                                 comma separated list of files
  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  If no files are specified, command will sort files defined in .pony/config.json.
  Possible values in the config are 'source', 'all', 'none' or array of files.

  Supported metadata:
  * Profile

EXAMPLES
  $ sfdx pony:source:sort
  $ sfdx pony:source:sort -f src/main/default/profiles/Admin.profile-meta.xml
  $ sfdx pony:source:sort -f src/main/default/profiles/Admin.profile-meta.xml 
  src/main/default/profiles/Standard.profile-meta.xml
  $ sfdx pony:source:sort -f src/main/default/profiles/*
```

## `sfdx pony:user:create -n <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

create a user by name defined in config

```
USAGE
  $ sfdx pony:user:create -n <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -n, --name=name                                                                   (required) comma-separated list of
                                                                                    user definition names

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation
```

## `sfdx pony:user:profile:assign -p <string> [-a <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

assign a profile to a user

```
USAGE
  $ sfdx pony:user:profile:assign -p <string> [-a <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --assigner=assigner                                                           user who will assign the profile,
                                                                                    this user must be authorized

  -p, --profile=profile                                                             (required) name of the profile

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Assigner is a user who will assign the profile. 
  If not specified, a user is created and after assignment deactivated.

  On behalf of is a list of users whom to assign the profile. 
  If not specified, the profile is assigned to target username.
```

## `sfdx pony:user:update -v <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

update admin user

```
USAGE
  $ sfdx pony:user:update -v <string> [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --values=values                                                               (required) a list of
                                                                                    <fieldName>=<value> pairs to search
                                                                                    for

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation
```
<!-- commandsstop -->
