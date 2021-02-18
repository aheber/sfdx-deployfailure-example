const { exec } = require("child_process");

async function doIt() {
  console.log("Creating scratch org");
  await sfdx(
    "force:org:create",
    "-f ./config/project-scratch-def.json -a deployfailuretests"
  );
  console.log("Setting deployment via REST");
  await sfdx("force:config:set", "restDeploy=true");
  console.log(
    "Looping through deployments looking for failure, if this takes more than 45 minutes, kill it and try again"
  );
  console.log(new Date());
  while (true) {
    process.stdout.write(".");
    const out = await sfdx(
      "force:source:deploy",
      "-u deployfailuretests -m LightningComponentBundle --json"
    );
    process.stderr.write(JSON.stringify(out, null, 2) + "\n");
    if (out.stderr && out.stderr.length > 0) {
      console.log("\n", out);
      break;
    }
  }
}
doIt().catch((err) => {
  console.error(err);
});

async function sfdx(command, args = "") {
  return new Promise((resolve, reject) => {
    const commandString = "sfdx " + command + " " + args;
    exec(commandString, (err, stdout, stderr) => {
      if (err) {
        reject({ status: 1, err: err, stdout, stderr });
        return;
      }
      resolve({ status: 0, err: err, stdout, stderr });
    });
  });
}
