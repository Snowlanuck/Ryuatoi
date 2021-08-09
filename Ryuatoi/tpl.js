"use strict"

const fs = require("fs");

let include_map = new Map();

let include = (path) => {
    if (include_map.has(path)) return include_map.get(path);
    return include_map.set(path, TPL.main(fs.readFileSync(`${TPL.path}/${path}`, "utf8"), TPL.data))
        .get(path);
}

class TPL {
    static data;
    static path;

    static main = function (tpl, data = this.data)
    {
        let k = [], v = [], _ = `let _=""`;
        for (let i in data)
        {
            k.push(i);
            v.push(data[i]);
        }
    
        let tpls = tpl.split("[:");
        for (let i in tpls)
        {
            let t = tpls[i].split(":]");
            if (i != 0)
            {
                if ("=" === t[0][0]) _ += `+(${t[0].substr(1)})`;
                else if ("-" === t[0][0]) _ += `+(\`${eval(t[0].substr(1))}\`)`;
                else _ += `;${t[0].replace(/\r\n/g, '')}_=_`;
            }
            _ += `+\`${t[t.length - 1].replace(/\'|\"/g,"\`")}\``;
        }
        _ += ";return _;";
        return (new Function(k, _)).apply(data, v);
    }
}

module.exports = TPL;