"use strict"

const fs = require("fs");

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

function gethead(value) {
    let values = value.split("\n"), res = {};
    for (let item of values) {
        item = item.trim();
        if (item.length === 0) continue;
        //res[item.substr(0, item.indexOf(":"))] = eval(item.substr(item.indexOf(":") + 1));
        res[item.substr(0, item.indexOf(":"))] = Function(`return ${item.substr(item.indexOf(":") + 1)}`)();
    }

    return res;
}

async function getfile(path) {
    let res = {}, value = await fs.promises.readFile(path, "utf8");
    if (!value.includes("---")) {
        res["content"] = value;
    }
    else {
        let head = value.substr(value.indexOf("---") + 3);
        res = gethead(head.substr(0, head.indexOf("---")));
        res["content"] = head.substr(head.indexOf("---") + 3);
    }

    return res;
}

async function readconfig(path, name, info) {
    name = name.substr(0, name.lastIndexOf('.'));
    info[name] = JSON.parse(await fs.promises.readFile(path));
}

const default_post = {
    title: "",
    data: "",
    tags: [],
    published: true,
    hideInList: false,
    feature: "",
    isTop: false,
    type: "",
    content: ""
};

async function readpost(path, name, info) {
    name = name.substr(0, name.lastIndexOf('.'));
    info[name] = {  ...default_post, ...await getfile(path) }
}

const default_theme = {
    is_generator: true,
    content: ""
};

async function readtheme(path, name, info) {
    name = name.substr(0, name.lastIndexOf('.'));
    info[name] = { ...default_theme, ...await getfile(path) }
}

const config_path = "./config";
const posts_path = "./posts";
let info = { config: {}, posts: {}, theme: {} };

module.exports = (callback) => {
    (async () => {
        await readfiles(config_path, info["config"], readconfig);
        await readfiles(posts_path, info["posts"], readpost);
        const theme_path = `./themes/${info["config"]["setting"]["config"]["theme"]}`;
        await readfiles(theme_path, info["theme"], readtheme);
        callback(info);
    })();
}
