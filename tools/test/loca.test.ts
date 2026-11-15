import { describe, expect, it } from "vitest";
import { Loca, parseLoca } from "../lib/loca.ts";

const en = parseLoca(`<?xml version="1.0" encoding="utf-8"?>
<contentList>
<content contentuid="h1" version="1">Chest</content>
<content contentuid="h2" version="2">&lt;b&gt;Bold&lt;/b&gt; &amp; more</content>
<content contentuid="h3" version="1">Only English</content>
</contentList>`);
const ru = parseLoca(`<contentList>
<content contentuid="h1" version="1">Сундук</content>
<content contentuid="h3" version="1"></content>
</contentList>`);

describe("loca", () => {
  const loca = new Loca(en, ru);

  it("reads strings and decodes entities", () => {
    expect(en.get("h1")).toBe("Chest");
    expect(en.get("h2")).toBe("<b>Bold</b> & more");
  });

  it("returns russian when present", () => {
    expect(loca.text("h1", "ru")).toBe("Сундук");
  });

  it("falls back to english when russian is missing or empty", () => {
    expect(loca.text("h2", "ru")).toBe("<b>Bold</b> & more");
    expect(loca.text("h3", "ru")).toBe("Only English");
  });

  it("returns undefined for unknown handles", () => {
    expect(loca.text("hNONE", "en")).toBeUndefined();
    expect(loca.text(undefined, "ru")).toBeUndefined();
  });
});
