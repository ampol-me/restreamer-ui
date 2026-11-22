// 1:1 port of legacy/src/utils/storage.js

const isAvailable = (): boolean => {
	// No DOM (tests, SSR): nothing to store to. In a browser this is never true.
	if (typeof window === 'undefined') {
		return false;
	}

	// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
	let storage: Storage | null = null;

	try {
		storage = window.localStorage;
		const x = '__storage_test__';
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	} catch (e) {
		return (
			e instanceof DOMException &&
			// everything except Firefox
			(e.code === 22 ||
				// Firefox
				e.code === 1014 ||
				// test name field too, because code might not be present
				// everything except Firefox
				e.name === 'QuotaExceededError' ||
				// Firefox
				e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
			// acknowledge QuotaExceededError only if there's something already stored
			!!storage &&
			storage.length !== 0
		);
	}
};

// Legacy callers also pass booleans (e.g. Set('expert', true)); localStorage stringifies them.
const Set = (key: string, value: string | boolean | number): void => {
	if (isAvailable() === false) {
		return;
	}

	window.localStorage.setItem('@@restreamer-ui@@' + key, value as string);
};

const Get = (key: string): string | null => {
	if (isAvailable() === false) {
		return null;
	}

	return window.localStorage.getItem('@@restreamer-ui@@' + key);
};

const Remove = (key: string): void => {
	if (isAvailable() === false) {
		return;
	}

	window.localStorage.removeItem('@@restreamer-ui@@' + key);
};

export { Set, Get, Remove };
