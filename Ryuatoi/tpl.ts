import { Extend } from "./extend";
import { info } from "./information"; //用 [:= Info.xx :] 或 [: Info["xx"] :] 可访问

let tpl_funcs = Extend.tpl_funcs;
export default function tplf(tpl: string, data: { [key: string]: any }, path: string = ""): string {
    let _: string = `let _=""`;
    let tpls: string[] = tpl.split("[:");
    tpls.forEach((val, idx) => {
        let t: string[] = val.split(":]");
        if (idx != 0) {
            let c: string = t[0][0];
            let v: string = t[0].substr(1).trim();
            if ("=" === c) _ += `+(${v})`;
            //else if ("*" === c) _ += `+($["${v}"])`; //用[:=$.xx:] 或 [:=$["xx"]:] 就可访问
            else if ("-" === c) {
                Extend.tpl_stats = { tpl: tpl, data: data, path: path };
                _ += `+(\`${eval(`tpl_funcs.${v}`)}\`)`;
            }
            else _ += `;${t[0].replace(/\r\n/g, '')}_=_`;
        }
        _ += `+\`${t[t.length - 1]}\``;
    });
    _ += ";return _;";
    return (new Function("$", "Info", _)).apply({}, [data, info]);
}