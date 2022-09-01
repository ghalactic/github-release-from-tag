import { trimTagAnnotation } from "../../src/git";

describe("trimTagAnnotation()", () => {
  it.each`
    label                 | annotation                                      | expected
    ${"partial"}          | ${"subject-a\nsubject-b\n\n"}                   | ${"subject-a\nsubject-b"}
    ${"subject and body"} | ${"subject-a\nsubject-b\n\nbody-a\nbody-b\n\n"} | ${"subject-a\nsubject-b\n\nbody-a\nbody-b"}
  `(
    "should trim whitespace from the annotation ($label)",
    ({ annotation, expected }) => {
      expect(trimTagAnnotation(annotation)).toBe(expected);
    }
  );

  it("should trim PGP signing keys", () => {
    const annotation = [
      "subject-a",
      "subject-b",
      "",
      "body-a",
      "-----BEGIN PGP SIGNATURE-----",
      "",
      "iQIzBAABCAAdFiEELLZbPCBduSq58dbnWRxnkP2taXMFAmMMZA8ACgkQWRxnkP2t",
      "aXM2/Q/9Fjr7gB0YUZQI93dzLUrNU91GFlylYBH951FtYlz2VX+udzzMl/mhCHlf",
      "OIxXVoEqFciICPWbtrTJGPeSqxohzlXkqg3sUbzP8rBeH3DKSJ8=",
      "=lnpv",
      "-----END PGP SIGNATURE-----",
      "body-b",
      "-----BEGIN PGP SIGNATURE-----",
      "",
      "tL5c9km8L0i3neF8XyYfa0EoSmYEh6iW/c037WYSobnZfvXOu/r5e34VWtxv/qAg",
      "8jiMYo7DQvhFBAI7QyJLl/pfaSH3ysjVhCVnO4QCRwYnG9cZLEnAXrAvc7rMbVqJ",
      "OIxXVoEqFciICPWbtrTJGPeSqxohzlXkqg3sUbzP8rBeH3DKSJ8=",
      "=lnpv",
      "-----END PGP SIGNATURE-----",
      "body-c",
    ].join("\n");

    const expected = [
      "subject-a",
      "subject-b",
      "",
      "body-a",
      "",
      "body-b",
      "",
      "body-c",
    ].join("\n");

    expect(trimTagAnnotation(annotation)).toBe(expected);
  });

  it("should trim SSH signing keys", () => {
    const annotation = [
      "subject-a",
      "subject-b",
      "",
      "body-a",
      "-----BEGIN SSH SIGNATURE-----",
      "U1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAgpForM0vBW+mtFkizer5lJTWae/",
      "eRPnL9htwseVbmHn0IcgY=",
      "-----END SSH SIGNATURE-----",
      "body-b",
      "-----BEGIN SSH SIGNATURE-----",
      "K9Ov9gzTj+kBz2vtIAAAADZ2l0AAAAAAAAAAZzaGE1MTIAAABTAAAAC3NzaC1lZDI1NTE5",
      "eRPnL9htwseVbmHn0IcgY=",
      "-----END SSH SIGNATURE-----",
      "body-c",
    ].join("\n");

    const expected = [
      "subject-a",
      "subject-b",
      "",
      "body-a",
      "",
      "body-b",
      "",
      "body-c",
    ].join("\n");

    expect(trimTagAnnotation(annotation)).toBe(expected);
  });
});
