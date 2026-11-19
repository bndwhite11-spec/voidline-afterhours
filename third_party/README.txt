LIBHEIF-JS1.23.5 SOURCE ARCHIVE

Archive:libheif-js-1.23.5-source.tar.gz
Bytes:3987889
SHA256:fc9540aa670c735abf81b1249053be293a6da144000f6a7bb66a1e3c19bf5880

Public repository download after this change is pushed:
https://github.com/bndwhite11-spec/voidline-afterhours/raw/refs/heads/main/third_party/libheif-js-1.23.5-source.tar.gz

The archive contains unmodified source/build trees for:
- libheif-js d8ec4bc3bc5bf8055975577bccbbc7e1d7313c2d
- libheif-emscripten5c8968a44e9c68ae677e24790d77d001ed7fe7cc
- its libheif submodule413e2a87e6a70b3eccc3a3adc5801179dd2d9e00
- complete libde2651.0.15 release source, including the original release tarball

Original license texts are retained. README.txt inside the archive explains
source layout, Emscripten3.1.61/Node24/TypeScript5 build prerequisites,
rebuild-wasm.sh, and replacement of VOIDLINE's standalone decoder assets.
PROVENANCE.json records exact download URLs/hashes, npm gitHead, submodule
verification and binary artifact hashes. SOURCE-FILES.sha256 covers the
unpacked archive contents.

Verified: npm1.23.5's gitHead matches the wrapper commit; the builder Git tree
points to the included libheif commit; the installed WASM and merged license
match the upstream v1.23.5 release byte-for-byte. No full Emscripten rebuild
or bit-for-bit reproducibility claim is made. No giant SDK/toolchain tree is
included; the required upstream version and acquisition URLs are documented.

This archive is intentionally outside dist/docs and the deployment Worker.
The repository provides it alongside the separately distributed decoder;
profile photo bytes are never sent to this repository or another service.
