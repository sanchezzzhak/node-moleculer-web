export type JSONValue =
    | string
    | number
    | boolean
    | JSONObject
    | JSONArray
    | null;

export interface JSONObject {
    [k: string]: JSONValue;
}
export type JSONArray = Array<JSONValue>;

type RouteOptionMethod = "get"|"post"|"any"|"options"|"head"|"put"|"connect"|"trace"|"patch"|"del";

export interface RouteOptions {
    path: string;
    method: RouteOptionMethod;
    controller?: string;
    action?: string;
    service?: string;
}