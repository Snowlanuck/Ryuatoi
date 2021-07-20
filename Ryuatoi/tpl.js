"use strict"

exports.tpl = function (tpl, data)
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
            _ += '=' === t[0][0]
                ? `+(${t[0].substr(1)})`
                : `;${t[0].replace(/\r\n/g, '')}_=_`;
        }
        _ += `+"${t[t.length - 1].replace(/\'/g,"\\'").replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n')}"`;
    }
    _ += ";return _;";
    return (new Function(k, _)).apply(data, v);
}