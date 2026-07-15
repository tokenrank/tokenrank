import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Footer } from "../../components/shell/footer";
import { githubRepositoryUrl } from "./site";

afterEach(cleanup);

describe("Footer", () => {
  it("links to the public TokenRank source repository", () => {
    render(<Footer locale="en" />);

    const githubLink = screen.getByRole("link", { name: "GitHub" });
    expect(githubLink.getAttribute("href")).toBe(githubRepositoryUrl);
    expect(githubLink.getAttribute("target")).toBe("_blank");
    expect(githubLink.getAttribute("rel")).toBe("noreferrer");
  });
});
