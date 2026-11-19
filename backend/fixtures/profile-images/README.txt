PROFILE CODEC TEST FIXTURES

conformance_window_padding.heic (656 bytes)
SHA256 cf670bad6021268e85db1d9e2593a5be1aa7f2ee1e706af5e76ee7abf2a73ec6
clap_cropped.heic (2060 bytes)
SHA256 54c62d0cb9e3ee09537788f9af59fff245791a681a80a16b27da1c23488a8e29

Unmodified upstream libheif conformance fixtures from:
https://github.com/strukturag/libheif/tree/413e2a87e6a70b3eccc3a3adc5801179dd2d9e00/tests/data
The upstream source and LGPL/GPL license texts are preserved in the project's
corresponding-source archive and the libheif decoder distribution. These tiny
fixtures are test data, not profile artwork or generated product assets.

rgb-uncompressed.tiff, rgba-uncompressed.tiff, gray16-uncompressed.tiff,
bilevel-default-uncompressed.tiff and rgb-lzw.tiff are synthetic
2x2 RGB / 2x1 grayscale test patterns created locally with Pillow13. RGB pixels
are red, green, blue and (240,230,220); grayscale values are0 and65535. They
contain no user photos. The LZW fixture proves an unsupported compressed TIFF
is rejected before decompression, rather than being falsely advertised.
