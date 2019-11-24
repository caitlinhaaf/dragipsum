import { writable } from 'svelte/store';

function createNumParagraphs() {
	const { subscribe, update } = writable(1);
	return {
		subscribe,
		increment: () => update(n => (n<5) ? n + 1 : n),
        decrement: () => update(n => (n>1) ? n - 1 : n)	
    };
}
export const numParagraphs = createNumParagraphs();

export const numSentences = writable(4);

export const nsfwMode = writable(false);