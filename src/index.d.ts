import {TemplatedApp, HttpRequest, HttpResponse} from "uWebSockets.js";
import {ServiceBroker, Context} from "moleculer";
import JWT from "./utils/jwt";

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

export interface RouteMultipartLimitOptions {
    fields: number;
    files: number;
    fileSize: number
}

export interface RouteRateLimitOptions {
    limit: number
}

export interface RouteCorsOptions {
    origin: string;
}



export interface RouteOptionsBase {
    action?: string;
    authenticate?: boolean;
    authorize?: boolean;
    cache?: number;
    controller?: string;
    cors: RouteCorsOptions;
    method: RouteOptionMethod | string;
    path: string;
    permission?: {
        post?: boolean
        files?: boolean,
        multipart?: RouteMultipartLimitOptions
    }
    service?: string;
    rateLimit?: RouteRateLimitOptions,
}

export interface RouteOptions extends RouteOptionsBase{
    onBefore?: onBeforeFunc;
    onAfter?: onAfterFunc;
}

type onBeforeFunc = ({route: RouteOptions, res: HttpResponse, req: HttpRequest}) => void;
type onAfterFunc = ({route: RouteOptions, res: HttpResponse, req: HttpRequest, data:string}) => string;

export interface CreateRouteOption {
    cache?: number;
    onBefore?: onBeforeFunc;
    onAfter?: onAfterFunc;
}

export interface UwsServerSettings {
    port: number;
    ssl: {
        [name: string]: any;
    };
    ip: string;
    publicDir: null | string;
    publicIndex: boolean | string;
    staticLastModified: boolean,
    staticCompress: boolean;
    portSchema: null | PortSchemaOption;
    routes: Array<RouteOptions>;
    controllers: {
        [name: string]: typeof AbstractController;
    },
    createRouteValidate?: boolean
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

export class RequestData  {
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
    setData(params: {}): void;
    getData(): any;
    constructor(
        req: HttpRequest | null,
        res: HttpResponse | null,
        route: RouteOptionsBase | null
    )
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

    initFromString(str: string): void;
    constructor(req: HttpRequest | null, res: HttpResponse | null)
}

export interface ServiceRenderResponse {
    type: "render" | "redirect";
    result: string;
    format?: string;
}

export interface AbstractControllerOptions {
    broker: ServiceBroker;
    req: HttpRequest;
    res: HttpResponse;
}

type RedirectType = "meta" | "header" | "js";

export class AbstractController {
    requestData: RequestData;
    cookieData: CookieData;
    jwt?: JWT;
    format: string;
    statusCode: number;
    statusCodeText: string;
    redirectType: RedirectType;
    headers: {
        [name: string]: any;
    }
    req: HttpRequest;
    res: HttpResponse;
    broker: ServiceBroker;

    constructor(opts: AbstractControllerOptions);

    initRequest(): void;

    initJWT(key: string, iat: any): void;

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

export interface HttpMixin {
    methods: {}
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
        runServiceAction(
            service: string,
            res: HttpResponse,
            req: HttpRequest,
            route: RouteOptions
        ): Promise<Array<any>>;
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