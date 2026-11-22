// These revisions preserve their original free catalog IDs, gift instances,
// pending grants and ownership history. Capsule-only models are registered separately.
import {curatedWorkshop} from './curated-workshop.mjs';
import {curatedCharacters} from './curated-characters.mjs';
import {curatedPaper} from './curated-paper.mjs';
import {curatedBench} from './curated-bench.mjs';
export const curatedGifts = Object.freeze({...curatedWorkshop,...curatedCharacters,...curatedPaper,...curatedBench});
