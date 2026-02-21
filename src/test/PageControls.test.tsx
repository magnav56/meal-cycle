import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageControls } from "@/components/PageControls";

describe("PageControls", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(
      <PageControls page={1} totalPages={1} onPage={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders page buttons for small page counts", () => {
    render(<PageControls page={1} totalPages={3} onPage={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(<PageControls page={1} totalPages={5} onPage={vi.fn()} />);
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<PageControls page={5} totalPages={5} onPage={vi.fn()} />);
    expect(screen.getByLabelText("Next page")).toBeDisabled();
  });

  it("calls onPage with next page when clicking next", async () => {
    const onPage = vi.fn();
    render(<PageControls page={2} totalPages={5} onPage={onPage} />);
    await userEvent.click(screen.getByLabelText("Next page"));
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it("calls onPage with previous page when clicking previous", async () => {
    const onPage = vi.fn();
    render(<PageControls page={3} totalPages={5} onPage={onPage} />);
    await userEvent.click(screen.getByLabelText("Previous page"));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("calls onPage when clicking a page number", async () => {
    const onPage = vi.fn();
    render(<PageControls page={1} totalPages={5} onPage={onPage} />);
    await userEvent.click(screen.getByText("3"));
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it("shows ellipsis for large page counts", () => {
    render(<PageControls page={5} totalPages={10} onPage={vi.fn()} />);
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });
});
