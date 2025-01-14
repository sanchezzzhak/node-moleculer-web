import {JSONObject} from "../index";

export interface JWTOptions {
    key: string;
    iat?: boolean | number;
}

export default class JWT {

    key: string;
    iat?: boolean |number;

    constructor(opts: JWTOptions);

    create(payload: JSONObject|any): string;

    extract(token: string): JSONObject|any;

}
