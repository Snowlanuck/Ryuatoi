import { Extend } from "./extend";
let tpl_funcs = Extend.tpl_funcs;
export default function tplf(tpl: string, data: { [key: string]: any }, path: string = ""): string {
    let _: string = `let _=""`;
    let tpls: string[] = tpl.split("[:");
    tpls.forEach((val, idx) => {
        let t: string[] = val.split(":]");
        if (idx != 0) {
            if ("=" === t[0][0]) _ += `+(${t[0].substr(1).trim()})`;
            else if ("*" === t[0][0]) _ += `+($["${t[0].substr(1).trim()}"])`;
            else if ("-" === t[0][0]) {
                Extend.tpl_stats = { tpl: tpl, data: data, path: path };
                _ += `+(\`${eval(`tpl_funcs.${t[0].substr(1).trim()}`)}\`)`;
            }
            else _ += `;${t[0].replace(/\r\n/g, '')}_=_`;
        }
        _ += `+\`${t[t.length - 1]}\``;
    });
    _ += ";return _;";
    // console.log(">>> ", _);
    return (new Function("$", _)).apply({}, [data]);
}