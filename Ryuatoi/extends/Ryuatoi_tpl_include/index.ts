import { Extend } from "../../extend";
import Path from "path";
import tplf from "../../tpl";
import * as Fs from "fs";

let include_map: { [key: string]: string } = {};
Extend.tpl_funcs["include"] = (path: string, data: object = Extend.tpl_stats.data) => {
    path = Path.resolve(Path.join(Extend.tpl_stats.path, path));
    if (path in include_map) {
        return include_map[path];
    }
    return include_map[path] = tplf(Fs.readFileSync(path, "utf-8"), data, Path.dirname(path));
}