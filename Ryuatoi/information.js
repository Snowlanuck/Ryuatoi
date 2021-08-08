"use strict"

const fs = require("fs");

const config_path = "./config";
const posts_path = "./posts";
let info = { config: {}, posts: {} };

async function readfiles(path, info, read) {
    let files = await fs.promises.readdir(path);
    for (let item of files) {
        let npath = `${path}/${item}`;
        if (fs.lstatSync(npath).isDirectory()) {
            await readfiles(npath, (info[item] = {}), read);
        }
        else {
            await read(npath, item, info);
        }
    }
}

async function readconfig(path, name, info) {
    name = name.substr(0, name.lastIndexOf('.'));
    info[name] = JSON.parse(await fs.promises.readFile(path));
}

function getJSON(value) {
    let values = value.split("\n"), res = {};
    for (let item of values) {
        item = item.trim();
        if (item.length === 0) continue;
        //res[item.substr(0, item.indexOf(":"))] = eval(item.substr(item.indexOf(":") + 1));
        res[item.substr(0, item.indexOf(":"))] = Function(`return ${item.substr(item.indexOf(":") + 1)}`)();
    }

    return res;
}

async function readpost(path, name, info) {
    name = name.substr(0, name.lastIndexOf('.'));

    let value = (await fs.promises.readFile(path)).toString();
    value = value.substr(value.indexOf("---") + 3);
    info[name] = getJSON(value.substr(0, value.indexOf("---")));
    info[name]["content"] = value.substr(value.indexOf("---") + 3);
}

module.exports = (callback) => {
    (async () => {
        await readfiles(config_path, info["config"], readconfig);
        await readfiles(posts_path, info["posts"], readpost);
        callback(info);
    })();
}
