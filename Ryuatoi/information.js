"use strict"

const fs = require("fs").promises;

async function readfiles(path, info, read) {
    let files = await fs.readdir(path);
    files = files.map(async item => {
        let npath = `${path}/${item}`;
        if ((await fs.stat(npath)).isDirectory()) {
            await readfiles(npath, (info[item] = {}), read);
        }
        else {
            await read(npath, item, info);
        }
    });

    await Promise.all(files);
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
    let res = {}, value = await fs.readFile(path, "utf8");
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
    info[name] = JSON.parse(await fs.readFile(path));
}

const default_post = {
    title: "",
    date: "",
    tags: [],
    published: true,
    hideInList: false,
    feature: "",
    isTop: false,
    type: "article",
    content: ""
};

async function readpost(path, name, info) {
    name = name.substr(0, name.lastIndexOf('.'));
    info[name] = {  ...default_post, ...await getfile(path) }
}

const default_theme = {
    type: "sjs",
    is_generator: true,
    content: ""
};

const default_theme_config = {
    article_template: "article.sjs",
    book_template: "book.sjs"
}

async function readtheme(path, name, info) {
    let suffix = name.substr(name.lastIndexOf('.') + 1);
    name = name.substr(0, name.lastIndexOf('.'));

    if (suffix == "sjs") {
        info[name] = { ...default_theme, ...await getfile(path) }
    }
    else if (name == "config" && suffix == "json") {
        info[name] = { ...default_theme_config, type: "json", ...JSON.parse(await fs.readFile(path)) };
    }
    else {
        info[name] = { ...default_theme, type: suffix, ...await getfile(path) };
    }
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
        if (!("config" in info["theme"])) {
            info["theme"]["config"] = { ...default_theme_config, type: "json" };
        }
        callback(info);
    })();
}
