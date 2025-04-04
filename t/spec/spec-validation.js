// spec/validation.js: Test validation.

describe("validation", function () {
    let V = Validation; // Shorthand for the validation module.
    // It's already loaded because it's a vendor module.

    it("can be loaded successfully", function () {
        expect(V).not.toBeUndefined();
        expect(typeof V.isValidColor).toBe("function");
    });

    it("passes the named colors", () => {
        expect(V.isValidColor("aliceblue")).toBe(true);
        expect(V.isValidColor("antiquewhite")).toBe(true);
        expect(V.isValidColor("aqua")).toBe(true);
        expect(V.isValidColor("aqua")).toBe(true);
        expect(V.isValidColor("aquamarine")).toBe(true);
        expect(V.isValidColor("azure")).toBe(true);
        expect(V.isValidColor("beige")).toBe(true);
        expect(V.isValidColor("bisque")).toBe(true);
        expect(V.isValidColor("black")).toBe(true);
        expect(V.isValidColor("blanchedalmond")).toBe(true);
        expect(V.isValidColor("blue")).toBe(true);
        expect(V.isValidColor("blueviolet")).toBe(true);
        expect(V.isValidColor("brown")).toBe(true);
        expect(V.isValidColor("burlywood")).toBe(true);
        expect(V.isValidColor("cadetblue")).toBe(true);
        expect(V.isValidColor("chartreuse")).toBe(true);
        expect(V.isValidColor("chocolate")).toBe(true);
        expect(V.isValidColor("coral")).toBe(true);
        expect(V.isValidColor("cornflowerblue")).toBe(true);
        expect(V.isValidColor("cornsilk")).toBe(true);
        expect(V.isValidColor("crimson")).toBe(true);
        expect(V.isValidColor("cyan")).toBe(true);
        expect(V.isValidColor("darkblue")).toBe(true);
        expect(V.isValidColor("darkcyan")).toBe(true);
        expect(V.isValidColor("darkgoldenrod")).toBe(true);
        expect(V.isValidColor("darkgray")).toBe(true);
        expect(V.isValidColor("darkgreen")).toBe(true);
        expect(V.isValidColor("darkgrey")).toBe(true);
        expect(V.isValidColor("darkkhaki")).toBe(true);
        expect(V.isValidColor("darkmagenta")).toBe(true);
        expect(V.isValidColor("darkolivegreen")).toBe(true);
        expect(V.isValidColor("darkorange")).toBe(true);
        expect(V.isValidColor("darkorchid")).toBe(true);
        expect(V.isValidColor("darkred")).toBe(true);
        expect(V.isValidColor("darksalmon")).toBe(true);
        expect(V.isValidColor("darkseagreen")).toBe(true);
        expect(V.isValidColor("darkslateblue")).toBe(true);
        expect(V.isValidColor("darkslategray")).toBe(true);
        expect(V.isValidColor("darkslategrey")).toBe(true);
        expect(V.isValidColor("darkturquoise")).toBe(true);
        expect(V.isValidColor("darkviolet")).toBe(true);
        expect(V.isValidColor("deeppink")).toBe(true);
        expect(V.isValidColor("deepskyblue")).toBe(true);
        expect(V.isValidColor("dimgray")).toBe(true);
        expect(V.isValidColor("dimgrey")).toBe(true);
        expect(V.isValidColor("dodgerblue")).toBe(true);
        expect(V.isValidColor("firebrick")).toBe(true);
        expect(V.isValidColor("floralwhite")).toBe(true);
        expect(V.isValidColor("forestgreen")).toBe(true);
        expect(V.isValidColor("fuchsia")).toBe(true);
        expect(V.isValidColor("fuchsia")).toBe(true);
        expect(V.isValidColor("gainsboro")).toBe(true);
        expect(V.isValidColor("ghostwhite")).toBe(true);
        expect(V.isValidColor("gold")).toBe(true);
        expect(V.isValidColor("goldenrod")).toBe(true);
        expect(V.isValidColor("gray")).toBe(true);
        expect(V.isValidColor("green")).toBe(true);
        expect(V.isValidColor("greenyellow")).toBe(true);
        expect(V.isValidColor("grey")).toBe(true);
        expect(V.isValidColor("honeydew")).toBe(true);
        expect(V.isValidColor("hotpink")).toBe(true);
        expect(V.isValidColor("indianred")).toBe(true);
        expect(V.isValidColor("indigo")).toBe(true);
        expect(V.isValidColor("ivory")).toBe(true);
        expect(V.isValidColor("khaki")).toBe(true);
        expect(V.isValidColor("lavender")).toBe(true);
        expect(V.isValidColor("lavenderblush")).toBe(true);
        expect(V.isValidColor("lawngreen")).toBe(true);
        expect(V.isValidColor("lemonchiffon")).toBe(true);
        expect(V.isValidColor("lightblue")).toBe(true);
        expect(V.isValidColor("lightcoral")).toBe(true);
        expect(V.isValidColor("lightcyan")).toBe(true);
        expect(V.isValidColor("lightgoldenrodyellow")).toBe(true);
        expect(V.isValidColor("lightgray")).toBe(true);
        expect(V.isValidColor("lightgreen")).toBe(true);
        expect(V.isValidColor("lightgrey")).toBe(true);
        expect(V.isValidColor("lightpink")).toBe(true);
        expect(V.isValidColor("lightsalmon")).toBe(true);
        expect(V.isValidColor("lightseagreen")).toBe(true);
        expect(V.isValidColor("lightskyblue")).toBe(true);
        expect(V.isValidColor("lightslategray")).toBe(true);
        expect(V.isValidColor("lightslategrey")).toBe(true);
        expect(V.isValidColor("lightsteelblue")).toBe(true);
        expect(V.isValidColor("lightyellow")).toBe(true);
        expect(V.isValidColor("lime")).toBe(true);
        expect(V.isValidColor("limegreen")).toBe(true);
        expect(V.isValidColor("linen")).toBe(true);
        expect(V.isValidColor("magenta")).toBe(true);
        expect(V.isValidColor("maroon")).toBe(true);
        expect(V.isValidColor("mediumaquamarine")).toBe(true);
        expect(V.isValidColor("mediumblue")).toBe(true);
        expect(V.isValidColor("mediumorchid")).toBe(true);
        expect(V.isValidColor("mediumpurple")).toBe(true);
        expect(V.isValidColor("mediumseagreen")).toBe(true);
        expect(V.isValidColor("mediumslateblue")).toBe(true);
        expect(V.isValidColor("mediumspringgreen")).toBe(true);
        expect(V.isValidColor("mediumturquoise")).toBe(true);
        expect(V.isValidColor("mediumvioletred")).toBe(true);
        expect(V.isValidColor("midnightblue")).toBe(true);
        expect(V.isValidColor("mintcream")).toBe(true);
        expect(V.isValidColor("mistyrose")).toBe(true);
        expect(V.isValidColor("moccasin")).toBe(true);
        expect(V.isValidColor("navajowhite")).toBe(true);
        expect(V.isValidColor("navy")).toBe(true);
        expect(V.isValidColor("of")).toBe(true);
        expect(V.isValidColor("of")).toBe(true);
        expect(V.isValidColor("oldlace")).toBe(true);
        expect(V.isValidColor("olive")).toBe(true);
        expect(V.isValidColor("olivedrab")).toBe(true);
        expect(V.isValidColor("orange")).toBe(true);
        expect(V.isValidColor("orangered")).toBe(true);
        expect(V.isValidColor("orchid")).toBe(true);
        expect(V.isValidColor("palegoldenrod")).toBe(true);
        expect(V.isValidColor("palegreen")).toBe(true);
        expect(V.isValidColor("paleturquoise")).toBe(true);
        expect(V.isValidColor("palevioletred")).toBe(true);
        expect(V.isValidColor("papayawhip")).toBe(true);
        expect(V.isValidColor("peachpuff")).toBe(true);
        expect(V.isValidColor("peru")).toBe(true);
        expect(V.isValidColor("pink")).toBe(true);
        expect(V.isValidColor("plum")).toBe(true);
        expect(V.isValidColor("powderblue")).toBe(true);
        expect(V.isValidColor("purple")).toBe(true);
        expect(V.isValidColor("rebeccapurple")).toBe(true);
        expect(V.isValidColor("red")).toBe(true);
        expect(V.isValidColor("rosybrown")).toBe(true);
        expect(V.isValidColor("royalblue")).toBe(true);
        expect(V.isValidColor("saddlebrown")).toBe(true);
        expect(V.isValidColor("salmon")).toBe(true);
        expect(V.isValidColor("sandybrown")).toBe(true);
        expect(V.isValidColor("seagreen")).toBe(true);
        expect(V.isValidColor("seashell")).toBe(true);
        expect(V.isValidColor("sienna")).toBe(true);
        expect(V.isValidColor("silver")).toBe(true);
        expect(V.isValidColor("skyblue")).toBe(true);
        expect(V.isValidColor("slateblue")).toBe(true);
        expect(V.isValidColor("slategray")).toBe(true);
        expect(V.isValidColor("slategrey")).toBe(true);
        expect(V.isValidColor("snow")).toBe(true);
        expect(V.isValidColor("springgreen")).toBe(true);
        expect(V.isValidColor("steelblue")).toBe(true);
        expect(V.isValidColor("tan")).toBe(true);
        expect(V.isValidColor("teal")).toBe(true);
        expect(V.isValidColor("thistle")).toBe(true);
        expect(V.isValidColor("tomato")).toBe(true);
        expect(V.isValidColor("turquoise")).toBe(true);
        expect(V.isValidColor("violet")).toBe(true);
        expect(V.isValidColor("wheat")).toBe(true);
        expect(V.isValidColor("white")).toBe(true);
        expect(V.isValidColor("whitesmoke")).toBe(true);
        expect(V.isValidColor("yellow")).toBe(true);
        expect(V.isValidColor("yellowgreen")).toBe(true);
    });

    it("rejects some random color names", () => {
        expect(V.isValidColor("has spaces")).toBe(false);
        expect(V.isValidColor("with-punc")).toBe(false);
        expect(V.isValidColor("digit9")).toBe(false);
    });

    it("passes the hex versions of the X11 color names", () => {
        expect(V.isValidColor("#000000")).toBe(true);
        expect(V.isValidColor("#000080")).toBe(true);
        expect(V.isValidColor("#00008b")).toBe(true);
        expect(V.isValidColor("#0000cd")).toBe(true);
        expect(V.isValidColor("#0000ff")).toBe(true);
        expect(V.isValidColor("#006400")).toBe(true);
        expect(V.isValidColor("#008000")).toBe(true);
        expect(V.isValidColor("#008080")).toBe(true);
        expect(V.isValidColor("#008b8b")).toBe(true);
        expect(V.isValidColor("#00bfff")).toBe(true);
        expect(V.isValidColor("#00ced1")).toBe(true);
        expect(V.isValidColor("#00fa9a")).toBe(true);
        expect(V.isValidColor("#00ff00")).toBe(true);
        expect(V.isValidColor("#00ff7f")).toBe(true);
        expect(V.isValidColor("#00ffff")).toBe(true);
        expect(V.isValidColor("#00ffff")).toBe(true);
        expect(V.isValidColor("#191970")).toBe(true);
        expect(V.isValidColor("#1e90ff")).toBe(true);
        expect(V.isValidColor("#20b2aa")).toBe(true);
        expect(V.isValidColor("#228b22")).toBe(true);
        expect(V.isValidColor("#2e8b57")).toBe(true);
        expect(V.isValidColor("#2f4f4f")).toBe(true);
        expect(V.isValidColor("#2f4f4f")).toBe(true);
        expect(V.isValidColor("#32cd32")).toBe(true);
        expect(V.isValidColor("#3cb371")).toBe(true);
        expect(V.isValidColor("#40e0d0")).toBe(true);
        expect(V.isValidColor("#4169e1")).toBe(true);
        expect(V.isValidColor("#4682b4")).toBe(true);
        expect(V.isValidColor("#483d8b")).toBe(true);
        expect(V.isValidColor("#48d1cc")).toBe(true);
        expect(V.isValidColor("#4b0082")).toBe(true);
        expect(V.isValidColor("#556b2f")).toBe(true);
        expect(V.isValidColor("#5f9ea0")).toBe(true);
        expect(V.isValidColor("#6495ed")).toBe(true);
        expect(V.isValidColor("#663399")).toBe(true);
        expect(V.isValidColor("#66cdaa")).toBe(true);
        expect(V.isValidColor("#696969")).toBe(true);
        expect(V.isValidColor("#696969")).toBe(true);
        expect(V.isValidColor("#6a5acd")).toBe(true);
        expect(V.isValidColor("#6b8e23")).toBe(true);
        expect(V.isValidColor("#708090")).toBe(true);
        expect(V.isValidColor("#708090")).toBe(true);
        expect(V.isValidColor("#778899")).toBe(true);
        expect(V.isValidColor("#778899")).toBe(true);
        expect(V.isValidColor("#7b68ee")).toBe(true);
        expect(V.isValidColor("#7cfc00")).toBe(true);
        expect(V.isValidColor("#7fff00")).toBe(true);
        expect(V.isValidColor("#7fffd4")).toBe(true);
        expect(V.isValidColor("#800000")).toBe(true);
        expect(V.isValidColor("#800080")).toBe(true);
        expect(V.isValidColor("#808000")).toBe(true);
        expect(V.isValidColor("#808080")).toBe(true);
        expect(V.isValidColor("#808080")).toBe(true);
        expect(V.isValidColor("#87ceeb")).toBe(true);
        expect(V.isValidColor("#87cefa")).toBe(true);
        expect(V.isValidColor("#8a2be2")).toBe(true);
        expect(V.isValidColor("#8b0000")).toBe(true);
        expect(V.isValidColor("#8b008b")).toBe(true);
        expect(V.isValidColor("#8b4513")).toBe(true);
        expect(V.isValidColor("#8fbc8f")).toBe(true);
        expect(V.isValidColor("#90ee90")).toBe(true);
        expect(V.isValidColor("#9370db")).toBe(true);
        expect(V.isValidColor("#9400d3")).toBe(true);
        expect(V.isValidColor("#98fb98")).toBe(true);
        expect(V.isValidColor("#9932cc")).toBe(true);
        expect(V.isValidColor("#9acd32")).toBe(true);
        expect(V.isValidColor("#a0522d")).toBe(true);
        expect(V.isValidColor("#a52a2a")).toBe(true);
        expect(V.isValidColor("#a9a9a9")).toBe(true);
        expect(V.isValidColor("#a9a9a9")).toBe(true);
        expect(V.isValidColor("#add8e6")).toBe(true);
        expect(V.isValidColor("#adff2f")).toBe(true);
        expect(V.isValidColor("#afeeee")).toBe(true);
        expect(V.isValidColor("#b0c4de")).toBe(true);
        expect(V.isValidColor("#b0e0e6")).toBe(true);
        expect(V.isValidColor("#b22222")).toBe(true);
        expect(V.isValidColor("#b8860b")).toBe(true);
        expect(V.isValidColor("#ba55d3")).toBe(true);
        expect(V.isValidColor("#bc8f8f")).toBe(true);
        expect(V.isValidColor("#bdb76b")).toBe(true);
        expect(V.isValidColor("#c0c0c0")).toBe(true);
        expect(V.isValidColor("#c71585")).toBe(true);
        expect(V.isValidColor("#cd5c5c")).toBe(true);
        expect(V.isValidColor("#cd853f")).toBe(true);
        expect(V.isValidColor("#d2691e")).toBe(true);
        expect(V.isValidColor("#d2b48c")).toBe(true);
        expect(V.isValidColor("#d3d3d3")).toBe(true);
        expect(V.isValidColor("#d3d3d3")).toBe(true);
        expect(V.isValidColor("#d8bfd8")).toBe(true);
        expect(V.isValidColor("#da70d6")).toBe(true);
        expect(V.isValidColor("#daa520")).toBe(true);
        expect(V.isValidColor("#db7093")).toBe(true);
        expect(V.isValidColor("#dc143c")).toBe(true);
        expect(V.isValidColor("#dcdcdc")).toBe(true);
        expect(V.isValidColor("#dda0dd")).toBe(true);
        expect(V.isValidColor("#deb887")).toBe(true);
        expect(V.isValidColor("#e0ffff")).toBe(true);
        expect(V.isValidColor("#e6e6fa")).toBe(true);
        expect(V.isValidColor("#e9967a")).toBe(true);
        expect(V.isValidColor("#ee82ee")).toBe(true);
        expect(V.isValidColor("#eee8aa")).toBe(true);
        expect(V.isValidColor("#f08080")).toBe(true);
        expect(V.isValidColor("#f0e68c")).toBe(true);
        expect(V.isValidColor("#f0f8ff")).toBe(true);
        expect(V.isValidColor("#f0fff0")).toBe(true);
        expect(V.isValidColor("#f0ffff")).toBe(true);
        expect(V.isValidColor("#f4a460")).toBe(true);
        expect(V.isValidColor("#f5deb3")).toBe(true);
        expect(V.isValidColor("#f5f5dc")).toBe(true);
        expect(V.isValidColor("#f5f5f5")).toBe(true);
        expect(V.isValidColor("#f5fffa")).toBe(true);
        expect(V.isValidColor("#f8f8ff")).toBe(true);
        expect(V.isValidColor("#fa8072")).toBe(true);
        expect(V.isValidColor("#faebd7")).toBe(true);
        expect(V.isValidColor("#faf0e6")).toBe(true);
        expect(V.isValidColor("#fafad2")).toBe(true);
        expect(V.isValidColor("#fdf5e6")).toBe(true);
        expect(V.isValidColor("#ff0000")).toBe(true);
        expect(V.isValidColor("#ff00ff")).toBe(true);
        expect(V.isValidColor("#ff00ff")).toBe(true);
        expect(V.isValidColor("#ff1493")).toBe(true);
        expect(V.isValidColor("#ff4500")).toBe(true);
        expect(V.isValidColor("#ff6347")).toBe(true);
        expect(V.isValidColor("#ff69b4")).toBe(true);
        expect(V.isValidColor("#ff7f50")).toBe(true);
        expect(V.isValidColor("#ff8c00")).toBe(true);
        expect(V.isValidColor("#ffa07a")).toBe(true);
        expect(V.isValidColor("#ffa500")).toBe(true);
        expect(V.isValidColor("#ffb6c1")).toBe(true);
        expect(V.isValidColor("#ffc0cb")).toBe(true);
        expect(V.isValidColor("#ffd700")).toBe(true);
        expect(V.isValidColor("#ffdab9")).toBe(true);
        expect(V.isValidColor("#ffdead")).toBe(true);
        expect(V.isValidColor("#ffe4b5")).toBe(true);
        expect(V.isValidColor("#ffe4c4")).toBe(true);
        expect(V.isValidColor("#ffe4e1")).toBe(true);
        expect(V.isValidColor("#ffebcd")).toBe(true);
        expect(V.isValidColor("#ffefd5")).toBe(true);
        expect(V.isValidColor("#fff0f5")).toBe(true);
        expect(V.isValidColor("#fff5ee")).toBe(true);
        expect(V.isValidColor("#fff8dc")).toBe(true);
        expect(V.isValidColor("#fffacd")).toBe(true);
        expect(V.isValidColor("#fffaf0")).toBe(true);
        expect(V.isValidColor("#fffafa")).toBe(true);
        expect(V.isValidColor("#ffff00")).toBe(true);
        expect(V.isValidColor("#ffffe0")).toBe(true);
        expect(V.isValidColor("#fffff0")).toBe(true);
        expect(V.isValidColor("#ffffff")).toBe(true);
    });

    it("passes the MDN examples", () => {
        expect(V.isValidColor("#f09")).toBe(true);
        expect(V.isValidColor("#F09")).toBe(true);
        expect(V.isValidColor("#ff0099")).toBe(true);
        expect(V.isValidColor("#FF0099")).toBe(true);
        expect(V.isValidColor("rgb(255,0,153)")).toBe(true);
        expect(V.isValidColor("rgb(255, 0, 153)")).toBe(true);
        expect(V.isValidColor("rgb(255, 0, 153.0)")).toBe(true);
        expect(V.isValidColor("rgb(100%,0%,60%)")).toBe(true);
        expect(V.isValidColor("rgb(100%, 0%, 60%)")).toBe(true);
        expect(V.isValidColor("rgb(100%, 0, 60%)")).toBe(true);
        expect(V.isValidColor("rgb(255 0 153)")).toBe(true);
        expect(V.isValidColor("#f09f")).toBe(true);
        expect(V.isValidColor("#F09F")).toBe(true);
        expect(V.isValidColor("#ff0099ff")).toBe(true);
        expect(V.isValidColor("#FF0099FF")).toBe(true);
        expect(V.isValidColor("rgb(255, 0, 153, 1)")).toBe(true);
        expect(V.isValidColor("rgb(255, 0, 153, 100%)")).toBe(true);
        expect(V.isValidColor("rgb(255 0 153 / 1)")).toBe(true);
        expect(V.isValidColor("rgb(255 0 153 / 100%)")).toBe(true);
        expect(V.isValidColor("#3a30")).toBe(true);
        expect(V.isValidColor("#3A3F")).toBe(true);
        expect(V.isValidColor("#33aa3300")).toBe(true);
        expect(V.isValidColor("#33AA3388")).toBe(true);
        expect(V.isValidColor("rgba(51, 170, 51, .1)")).toBe(true);
        expect(V.isValidColor("rgba(51, 170, 51, .4)")).toBe(true);
        expect(V.isValidColor("rgba(51, 170, 51, .7)")).toBe(true);
        expect(V.isValidColor("rgba(51, 170, 51,  1)")).toBe(true);
        expect(V.isValidColor("rgba(51 170 51 / 0.4)")).toBe(true);
        expect(V.isValidColor("rgba(51 170 51 / 40%)")).toBe(true);
        expect(V.isValidColor("hsl(270,60%,70%)")).toBe(true);
        expect(V.isValidColor("hsl(270, 60%, 70%)")).toBe(true);
        expect(V.isValidColor("hsl(270 60% 70%)")).toBe(true);
        expect(V.isValidColor("hsl(270deg, 60%, 70%)")).toBe(true);
        expect(V.isValidColor("hsl(4.71239rad, 60%, 70%)")).toBe(true);
        expect(V.isValidColor("hsl(.75turn, 60%, 70%)")).toBe(true);
        expect(V.isValidColor("hsl(270, 60%, 50%, .15)")).toBe(true);
        expect(V.isValidColor("hsl(270, 60%, 50%, 15%)")).toBe(true);
        expect(V.isValidColor("hsl(270 60% 50% / .15)")).toBe(true);
        expect(V.isValidColor("hsl(270 60% 50% / 15%)")).toBe(true);
        expect(V.isValidColor("hsl(0,   100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(30,  100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(60,  100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(90,  100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(150, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(180, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(210, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(240, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(270, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(300, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(330, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(360, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 0%)   ")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 20%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 40%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 60%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 80%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 100%) ")).toBe(true);
        expect(V.isValidColor("hsl(120, 100%, 50%)  ")).toBe(true);
        expect(V.isValidColor("hsl(120, 80%,  50%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 60%,  50%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 40%,  50%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 20%,  50%)")).toBe(true);
        expect(V.isValidColor("hsl(120, 0%,   50%)  ")).toBe(true);
        expect(V.isValidColor("hsla(240, 100%, 50%, .05)")).toBe(true);
        expect(V.isValidColor("hsla(240, 100%, 50%, .4)")).toBe(true);
        expect(V.isValidColor("hsla(240, 100%, 50%, .7)")).toBe(true);
        expect(V.isValidColor("hsla(240, 100%, 50%, 1)")).toBe(true);
        expect(V.isValidColor("hsla(240 100% 50% / .05)")).toBe(true);
        expect(V.isValidColor("hsla(240 100% 50% / 5%)")).toBe(true);
    });
});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
