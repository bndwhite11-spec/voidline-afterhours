// Loaded only after a deliberate profile-image selection.
export {inspectProfileImage} from './profile-image-validation.mjs';
export {prepareProfileSvg} from './profile-svg.mjs';
// Reuse the bounded strict decoder and exact PNG poster used by private media.
// This bundle is requested only after a deliberate local image selection.
export {prepareProfileGif as prepareProfileGifPoster} from './profile-gif.mjs';
