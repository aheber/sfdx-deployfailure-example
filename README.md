This repo is to reproduce a bug with the REST Metadata API Implementation.

Two bugs actually, the first is that SFDX assumes the REST endpoint will always return JSON, it doesn't, beyond that when it crashes trying to parse the JSON it returns a 0 status code which is totally incorrect.
The second bug is to demonstrate that sometime after a scratch org is spawned the REST endpoint begins to fail. It typically comes back in time but is causing difficulties with our org creation process.

The script `doItWithRest.js` in the root directory can be used to create an org, set the project to use the REST API to deploy, then loops a deploy until that deploy fails. It can take a long time, often ~30 minutes or more for the REST API to throw the errors. The error we're expecting looks about like this.

```
SyntaxError: Unexpected token < in JSON at position 1
    at JSON.parse (<anonymous>)
    at Request._callback (C:\\Users\\<user>\\AppData\\Local\\sfdx\\client\\7.85.1-2fb9e41053\\node_modules\\salesforce-alm\\dist\\lib\\core\\force.js:583:25)
    at Request.self.callback (C:\\Users\\<user>\\AppData\\Local\\sfdx\\client\\7.85.1-2fb9e41053\\node_modules\\request\\request.js:185:22)
    at Request.emit (events.js:315:20)
    at Request.<anonymous> (C:\\Users\\<user>\\AppData\\Local\\sfdx\\client\\7.85.1-2fb9e41053\\node_modules\\request\\request.js:1154:10)
    at Request.emit (events.js:315:20)
    at IncomingMessage.<anonymous> (C:\\Users\\<user>\\AppData\\Local\\sfdx\\client\\7.85.1-2fb9e41053\\node_modules\\request\\request.js:1076:12)
    at Object.onceWrapper (events.js:421:28)
    at IncomingMessage.emit (events.js:327:22)
    at endReadableNT (_stream_readable.js:1220:12)
    at processTicksAndRejections (internal/process/task_queues.js:84:21)
```

The relevant portions of that code look like this, the `body = JSON.parse(body)` is what is generating the error and that error handling path isn't crashing out with the correct exit code.
`C:\Users\<user>\AppData\Local\sfdx\client\7.85.1-2fb9e41053\node_modules\salesforce-alm\dist\lib\core\force.js`

```
LINE 574
Force.prototype.mdapiRestDeploy = function (orgApi, zipStream, options) {
    let headers = {};
    return this._getConnection(orgApi, this.config)
        .then(connection => {
        headers = this.setRestHeaders(connection);
        return `${connection.instanceUrl}/services/data/v${this.config.getApiVersion()}/metadata/deployRequest`;
    })
        .then(url => new BBPromise((resolve, reject) => {
        const r = requestModule.post(url, { headers }, (err, httpResponse, body) => {
            body = JSON.parse(body);
            if (err || httpResponse.statusCode > 300) {
                let error;
                if (body[0].errorCode === 'API_DISABLED_FOR_ORG') {
                    error = almError('mdDeployCommandCliNoRestDeploy');
                }
                else {
                    error = new Error(`${body[0].errorCode}: ${body[0].message}`);
                }
                reject(error);
            }
            else {
                resolve(body);
            }
        });
```

The actual response coming from the endpoint that throws that error looks something like this. Remembering that this deploy works many times until it just doesn't for some period of time.

ENDPOINT: `https://<org url>-dev-ed.cs91.my.salesforce.com//services/data/v50.0/metadata/deployRequest`

```
<html>
    <body>

    <table cellspacing=10>
        <tr>
            <td><span style="font-weight: bold; font-size: 12pt;">Illegal Request</span></td>
        </tr>
        <tr>
            <td>You have sent us an Illegal URL or an improperly formatted request.
            </td>
        </tr>
        <tr>
            <td>

            </td>
        </tr>
    </table>



    <!-- Body events -->
    <script type="text/javascript">function bodyOnLoad(){if(window.PreferenceBits){window.PreferenceBits.prototype.csrfToken="null";};}function odyOnBeforeUnload(){}function bodyOnFocus(){}function bodyOnUnload(){}</script>
    \t\t\t
    </body>
    </html>


    <!--
    ...................................................................................................
    ...................................................................................................
    ...................................................................................................
    ...................................................................................................
    -->
```
