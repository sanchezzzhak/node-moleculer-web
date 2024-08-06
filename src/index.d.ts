import {TemplatedApp, HttpRequest, HttpResponse} from "uWebSockets.js";
import {ServiceBroker} from "moleculer";

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

type RouteOptionMethod = "get" | "post" | "any" | "options"
    | "head" | "put" | "connect" | "trace" | "patch" | "del";

type PortSchemaOption = "node" | "auto";

export interface RouteOptions {
    path: string;
    method: RouteOptionMethod;
    controller?: string;
    action?: string;
    service?: string;
    cache?: number;
    onBefore?: Function;
    onAfter?: Function;
}
export interface CreateRouteOption {
    cache?: number;
    onBefore?: Function;
    onAfter?: Function;
}

export interface UwsServerSettings {
    port: number;
    ssl: {
        [name: string]: any;
    };
    ip: string;
    publicDir: null | string;
    publicIndex: boolean | string;
    portSchema: null | PortSchemaOption;
    routes: Array<RouteOptions>;
    controllers: {
        [name: string]: typeof AbstractController;
    }
}

export interface RenderRawOptions {
    view: string;
    httpCode?: string | null
    format?: string | null;
}

export interface RenderOptions {
    template: string;
    params: {
        [name: string]: any;
    };
    httpCode?: number | null;
    format?: string | null;
}

export class RequestData {
    headers: {
        [name: string]: string;
    };
    host: string;
    ip: string;
    ipProxy: string;
    query: {
        [name: string]: any;
    };
    queryRaw: string;
    url: string;
    userAgent: string;

    constructor(req: HttpRequest, res: HttpResponse)
}

export interface CookieOptions {
    path?: string;
    domain?: string;
    sameSite?: "strict" | "lax" | "none";
    priority?: "low" | "medium" | "high";
    expires?: Date|number|string;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    partitioned?: boolean;
}

export class CookieData {
    reqs: {};
    resp: {};
    set(name: string, value: any, options?: CookieOptions): void;
    get(name: string, defaultValue?: any): any;
    has(name: string): boolean;
    remove(name: string, options?: CookieOptions): void;
    toHeader(name: string): string;
    constructor(req: HttpRequest, res: HttpResponse)
}

export interface AbstractControllerOptions {
    broker: ServiceBroker;
    req: HttpRequest;
    res: HttpResponse;
}

export class AbstractController {
    requestData: RequestData;
    cookieData: CookieData;
    format: string;
    statusCode: number;
    statusCodeText: string;
    redirectType: string;
    headers: {
        [name: string]: any;
    }
    req: HttpRequest;
    res: HttpResponse;
    broker: ServiceBroker;

    constructor(opts: AbstractControllerOptions);

    initRequest(): void;

    compactErrors(listErrors: []): any;

    asJson(obl: JSONObject, statusCode: number): string;

    writeHeader(key: string, value: string): void;

    setCorsHeaders(): void;

    setClientHintsHeaders(): void;

    isAborted(): boolean;

    readBody(): Promise<string>;

    renderRaw(opts: RenderRawOptions): string;

    render(opts: RenderOptions): string;

    setStatus(httpCode: number): void;

    redirect(location: string, httpCode: number): string;
}

export interface UwsServer {
    server: TemplatedApp | null;
    name: string;
    settings: UwsServerSettings;

    created(): Promise<void>;

    started(): Promise<void>;

    methods: {
        createRoute(route: string, options: CreateRouteOption): void;
        addRoute(route: RouteOptions): void;
        bindRoutes(): void;
        bindRoutesStatic(): void;
        getServerUws(): TemplatedApp | null;
        runControllerAction(
            controller: string,
            action: string,
            res: HttpResponse,
            req: HttpRequest,
            route: RouteOptions
        ): Promise<Array<any>>;
        listenServer(): Promise<any>;
        initServer(): void;
    };
}