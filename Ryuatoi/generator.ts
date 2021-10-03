import { getinfo } from "./information";
import { Extend } from "./extend";

let generator = () => {
    getinfo(async () => {
        //console.dir(value, { depth: null });
        Extend.RenderEvent.execute_all();
    });
}

generator();