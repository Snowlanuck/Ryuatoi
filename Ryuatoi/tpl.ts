import * as Fs from "fs";
import * as Path from "path";

let include_map: Map<string, string> = new Map();

export default function tplf(tpl: string, data: object, path: string = ""): string {
    let include = (ipath: string, idata: object = data): string => {
        ipath = Path.resolve(Path.join(path, ipath));
        if (include_map.has(ipath)) {
            return include_map.get(ipath);
        }
        return include_map.set(ipath, tplf(Fs.readFileSync(ipath, "utf8"), idata, Path.dirname(ipath))).get(ipath);
    }

    let k: string[] = [],
        v: string[] = [],
        _: string = `let _=""`;

    for (let i in data) {
        k.push(i);
        v.push(data[i]);
    }

    let tpls: string[] = tpl.split("[:");
    tpls.forEach((val, idx) => {
        let t: string[] = val.split(":]");
        if (idx != 0) {
            if ("=" === t[0][0]) _ += `+(${t[0].substr(1)})`;
            else if ("-" === t[0][0]) _ += `+(\`${eval(t[0].substr(1))}\`)`;
            else _ += `;${t[0].replace(/\r\n/g, '')}_=_`;
        }
        _ += `+\`${t[t.length - 1]}\``;
    });
    _ += ";return _;";
    return (new Function(...k, _)).apply(data, v);
}