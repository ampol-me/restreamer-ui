// Port of legacy/src/utils/api.js — thin fetch wrapper around the datarhei-core REST API.

export interface APIError {
	code: number;
	message: string;
}

export interface APIResult<T = any> {
	err: APIError | null;
	val: T | null;
}

export type TokenSource = string | (() => Promise<string>);

interface CallOptions extends RequestInit {
	expect?: 'any' | 'json';
	token?: string;
	headers?: Record<string, string>;
}

class API {
	base: string;
	address: string;
	token: TokenSource;
	cache: Map<string, { payload: any; ts: number }>;

	constructor(address: string) {
		this.base = '/api';
		this.address = address;
		this.token = '';

		this.cache = new Map();
	}

	_debug(_message: string) {
		//console.log(`[CoreAPI] ${message}`);
	}

	_error(message: string) {
		console.error(`[CoreAPI] Error: ${message}`);
	}

	async _GET(path: string, options?: CallOptions): Promise<APIResult> {
		const key = path + JSON.stringify(options);

		const data = this.cache.get(key);
		if (data !== undefined) {
			const millis = Date.now() - data.ts;

			if (millis < 950) {
				return JSON.parse(JSON.stringify(data.payload));
			}
		}

		const ts = Date.now();

		const res = await this._call('GET', path, options);

		this.cache.set(key, {
			payload: JSON.parse(JSON.stringify(res)),
			ts: ts,
		});

		return res;
	}

	async _HEAD(path: string, options?: CallOptions): Promise<APIResult> {
		return await this._call('HEAD', path, options);
	}

	async _POST(path: string, options?: CallOptions): Promise<APIResult> {
		return await this._call('POST', path, options);
	}

	async _PUT(path: string, options?: CallOptions): Promise<APIResult> {
		return await this._call('PUT', path, options);
	}

	async _DELETE(path: string, options?: CallOptions): Promise<APIResult> {
		return await this._call('DELETE', path, options);
	}

	async _PATCH(path: string, options?: CallOptions): Promise<APIResult> {
		return await this._call('PATCH', path, options);
	}

	async _call(method: string, path: string, opts: CallOptions = {}): Promise<APIResult> {
		const options: Required<Pick<CallOptions, 'method' | 'expect' | 'headers' | 'token'>> & CallOptions = {
			method: method.toUpperCase(),
			expect: 'any',
			headers: {},
			token: '',
			...opts,
		};

		path = this.base + path;
		if (path !== '/') {
			// remove slash at the end of the path
			if (path[path.length - 1] === '/') {
				path = path.substring(0, path.length - 1);
			}
		}

		let token = '';

		if (options.token.length !== 0) {
			token = options.token;
		} else {
			if (typeof this.token === 'function') {
				token = await this.token();
			} else {
				token = this.token;
			}
		}

		if (token.length !== 0) {
			options.headers.Authorization = 'Bearer ' + token;
		}

		this._debug(`calling ${options.method} ${this.address + path}`);

		const res: APIResult = {
			err: null,
			val: null,
		};

		let response: Response;

		try {
			response = await fetch(this.address + path, options);
		} catch (err: any) {
			res.err = {
				code: -1,
				message: err.message,
			};

			this._error(res.err!.message);

			return res;
		}

		const contentType = response.headers.get('Content-Type');
		let isJSON = false;

		if (contentType != null) {
			isJSON = contentType.indexOf('application/json') !== -1;
		}

		if (response.ok === false) {
			res.err = {
				code: response.status,
				message: response.statusText,
			};

			if (isJSON === true) {
				const body = await response.json();

				if ('code' in body && 'message' in body) {
					res.err!.message = body.message;
				} else {
					res.err!.message = body;
				}
			} else {
				const body = await response.text();
				if (body.length > 0) {
					res.err!.message = body;
				}
			}

			this._error(res.err!.message);

			return res;
		}

		if (isJSON === true) {
			res.val = await response.json();
		} else {
			res.val = await response.text();
		}

		if (options.expect === 'json') {
			if (isJSON === false) {
				res.val = null;
				res.err = {
					code: -2,
					message: `The response is not JSON as expected (${contentType})`,
				};

				this._error(res.err!.message);
			}
		}

		return res;
	}

	SetAddress(address: string) {
		this.address = address;
	}

	SetToken(token: TokenSource) {
		this.token = token;
		this.cache = new Map();
	}

	async Login(username: string, password: string) {
		return await this._POST('/login', {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				username: username,
				password: password,
			}),
			expect: 'json',
		});
	}

	async LoginWithToken(token: string) {
		return await this._POST('/login', {
			headers: {
				'Content-Type': 'application/json',
			},
			expect: 'json',
			token: token,
		});
	}

	async RefreshToken(refresh_token: string) {
		return await this._GET('/login/refresh', {
			expect: 'json',
			token: refresh_token,
		});
	}

	async About() {
		return await this._GET('/', {
			expect: 'json',
		});
	}

	async Skills() {
		return await this._GET('/v3/skills', {
			expect: 'json',
		});
	}

	async SkillsReload() {
		return await this._GET('/v3/skills/reload', {
			expect: 'json',
		});
	}

	async Config(_type?: string) {
		return await this._GET('/v3/config', {
			expect: 'json',
		});
	}

	async ConfigSet(config: any) {
		return await this._PUT('/v3/config', {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(config),
			expect: 'json',
		});
	}

	async ConfigReload(_type?: string) {
		return await this._GET('/v3/config/reload');
	}

	async Log() {
		return await this._GET('/v3/log', {
			expect: 'json',
		});
	}

	async ActiveSessions(collectors: string[]) {
		return await this._GET('/v3/session/active?collectors=' + encodeURIComponent(collectors.join(',')), {
			expect: 'json',
		});
	}

	async SetMetadata(key: string, data: any) {
		return await this._PUT('/v3/metadata/' + encodeURIComponent(key), {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
			expect: 'json',
		});
	}

	async GetMetadata(key: string) {
		return await this._GET('/v3/metadata/' + encodeURIComponent(key), {
			expect: 'json',
		});
	}

	async DataHasFile(path: string) {
		return await this._HEAD('/v3/fs/disk' + path);
	}

	async DataPutFile(path: string, data: BodyInit) {
		return await this._PUT('/v3/fs/disk' + path, {
			headers: {
				'Content-Type': 'application/data',
			},
			body: data,
		});
	}

	/**
	 * DataPutFile for large files: the browser streams the Blob from disk instead of holding it in
	 * memory, and reports how much has been sent (fetch cannot report upload progress).
	 */
	async DataPutFileProgress(path: string, data: Blob, onProgress?: (sent: number, total: number) => void): Promise<APIResult> {
		if (typeof XMLHttpRequest === 'undefined') {
			return await this.DataPutFile(path, data);
		}

		const token = typeof this.token === 'function' ? await this.token() : this.token;

		return await new Promise<APIResult>((resolve) => {
			const request = new XMLHttpRequest();
			request.open('PUT', this.address + this.base + '/v3/fs/disk' + path);
			request.setRequestHeader('Content-Type', 'application/data');
			if (token.length !== 0) {
				request.setRequestHeader('Authorization', 'Bearer ' + token);
			}
			request.upload.onprogress = (event) => onProgress?.(event.loaded, event.total || data.size);
			request.onerror = () => resolve({ val: null, err: { code: -1, message: 'The upload was interrupted.' } });
			request.onload = () => {
				if (request.status >= 200 && request.status < 300) {
					resolve({ val: null, err: null });
				} else {
					resolve({ val: null, err: { code: request.status, message: request.responseText || request.statusText } });
				}
			};
			request.send(data);
		});
	}

	async DataGetFile(path: string) {
		return await this._GET('/v3/fs/disk' + path);
	}

	async DataListFiles(pathPattern: string) {
		return await this._GET('/v3/fs/disk?glob=' + encodeURIComponent(pathPattern), {
			expect: 'json',
		});
	}

	async DataDeleteFile(path: string) {
		return await this._DELETE('/v3/fs/disk' + path);
	}

	async MemFSListFiles(pathPattern: string) {
		return await this._GET('/v3/fs/mem?glob=' + encodeURIComponent(pathPattern), {
			expect: 'json',
		});
	}

	async MemFSHasFile(path: string) {
		return await this._HEAD('/v3/fs/mem' + path);
	}

	async MemFSDeleteFile(path: string) {
		return await this._DELETE('/v3/fs/mem' + path);
	}

	async MemFSLinkFile(path: string, linkto: string) {
		return await this._PATCH('/v3/fs/mem/' + path, {
			headers: {
				'Content-Type': 'application/data',
			},
			body: linkto,
		});
	}

	async Processes(reference = '', ids: string[] = [], filter: string[] = []) {
		let url = '/v3/process';
		const params: string[] = [];

		if (reference.length !== 0) {
			params.push('reference=' + encodeURIComponent(reference));
		}

		if (ids.length !== 0) {
			params.push('id=' + encodeURIComponent(ids.join(',')));
		}

		if (filter.length !== 0) {
			params.push('filter=' + encodeURIComponent(filter.join(',')));
		}

		if (params.length !== 0) {
			url = url + '?' + params.join('&');
		}

		return await this._GET(url, {
			expect: 'json',
		});
	}

	async Process(name: string, filter: string[] = []) {
		let url = '/v3/process/' + name;
		if (filter.length !== 0) {
			url = url + '?filter=' + encodeURIComponent(filter.join(','));
		}

		return await this._GET(url, {
			expect: 'json',
		});
	}

	async ProcessConfig(name: string) {
		return await this._GET('/v3/process/' + encodeURIComponent(name) + '/config', {
			expect: 'json',
		});
	}

	async ProcessState(name: string) {
		return await this._GET('/v3/process/' + encodeURIComponent(name) + '/state', {
			expect: 'json',
		});
	}

	async ProcessReport(name: string) {
		return await this._GET('/v3/process/' + encodeURIComponent(name) + '/report', {
			expect: 'json',
		});
	}

	async ProcessCommand(name: string, command: string) {
		return await this._PUT('/v3/process/' + encodeURIComponent(name) + '/command', {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				command: command,
			}),
			expect: 'json',
		});
	}

	async ProcessDelete(name: string) {
		return await this._DELETE('/v3/process/' + encodeURIComponent(name));
	}

	async ProcessUpdate(name: string, config: any) {
		return await this._PUT('/v3/process/' + encodeURIComponent(name), {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(config),
		});
	}

	async ProcessSetMetadata(name: string, key: string, data: any) {
		return await this._PUT('/v3/process/' + encodeURIComponent(name) + '/metadata/' + encodeURIComponent(key), {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
			expect: 'json',
		});
	}

	async ProcessGetMetadata(name: string, key: string) {
		return await this._GET('/v3/process/' + encodeURIComponent(name) + '/metadata/' + encodeURIComponent(key), {
			expect: 'json',
		});
	}

	async ProcessAdd(config: any) {
		return await this._POST('/v3/process', {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(config),
			expect: 'json',
		});
	}

	async ProcessProbe(name: string) {
		return await this._GET('/v3/process/' + encodeURIComponent(name) + '/probe', {
			expect: 'json',
		});
	}

	async Metrics(query: any) {
		return await this._POST('/v3/metrics', {
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(query),
			expect: 'json',
		});
	}

	async RTMPChannels() {
		const res = await this._GET('/v3/rtmp', {
			expect: 'json',
		});

		if (res.err !== null) {
			return res;
		}

		res.val = res.val.map((f: { name: string }) => f.name);

		return res;
	}

	async SRTChannels() {
		const res = await this._GET('/v3/srt', {
			expect: 'json',
		});

		if (res.err !== null) {
			return res;
		}

		const val = res.val;
		const paths: string[] = [];
		res.val = paths;

		for (const path in val.publisher) {
			paths.push(path);
		}

		return res;
	}
}

export default API;
