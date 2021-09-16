import { Extend } from "../../extend";
import { File, Folder, fname, ftype, config } from "../../information";
import { promises as Fs } from "fs";
import * as Yaml from "yaml";

Extend.ReadFile["yml"] = async (path: string, info: Folder) => {
    let text: string = Extend.config_parse(await Fs.readFile(path, "utf-8"));
    info[fname(path)] = Object.assign(new File(fname(path), ftype(path), null, path), Yaml.parse(text));
}