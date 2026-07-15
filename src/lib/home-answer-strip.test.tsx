import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeAnswerStrip } from "../../components/home/home-answer-strip";
import { getCopy } from "../i18n/copy";

afterEach(cleanup);

describe("HomeAnswerStrip", () => {
  it.each([
    ["en" as const, "WHAT IS TOKENRANK"],
    ["zh" as const, "TOKENRANK 是什么"],
  ])("renders the compact %s title without legacy copy or punctuation", (locale, title) => {
    const copy = getCopy(locale).home.answer;
    const { container, getByRole } = render(<HomeAnswerStrip copy={copy} />);

    expect(getByRole("heading", { level: 2, name: title })).toBeDefined();
    expect(container.textContent).not.toContain("Quick answer");
    expect(container.textContent).not.toContain("快速回答");
    expect(container.textContent).not.toContain(`${title}?`);
    expect(container.querySelector("h2")?.className).toContain("text-lg");
    expect(container.querySelector("p")?.className).toContain("text-sm");
    expect(container.querySelector("p")?.className).toContain("leading-5");
  });
});
