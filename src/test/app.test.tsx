import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { DemoStateProvider } from "../state/DemoState";

const renderAt = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <DemoStateProvider>
        <App />
      </DemoStateProvider>
    </MemoryRouter>
  );

describe("Nhịp core flows", () => {
  beforeEach(() => window.localStorage.clear());

  it("requires the organizer to correct the room before publishing", async () => {
    const user = userEvent.setup();
    renderAt("/organizer/review");

    const publish = screen.getByRole("button", { name: /duyệt và xuất bản/i });
    expect(publish).toBeDisabled();

    const room = screen.getByLabelText(/phòng thuyết trình/i);
    await user.clear(room);
    await user.type(room, "B.305");
    expect(publish).toBeEnabled();

    await user.click(publish);
    expect(await screen.findByText(/thông báo đã sẵn sàng để chia sẻ/i)).toBeInTheDocument();
  });

  it("returns the grounded fallback for an unknown member question", async () => {
    const user = userEvent.setup();
    renderAt("/member");

    const question = screen.getByLabelText("Câu hỏi");
    await user.type(question, "Có được đổi đề tài vào tuần sau không?");
    await user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));

    expect(
      await screen.findByText(/hãy hỏi người tổ chức để tránh nhận hướng dẫn sai/i)
    ).toBeInTheDocument();
  });

  it("lets the demo member submit a team link", async () => {
    const user = userEvent.setup();
    renderAt("/member");

    const input = screen.getByLabelText(/liên kết google drive của nhóm/i);
    await user.type(input, "https://drive.google.com/demo-team");
    await user.click(screen.getByRole("button", { name: /gửi bài cho lan/i }));

    expect(await screen.findByText("Bạn đã hoàn thành")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem("nhip-prototype-state-v1")).toContain(
        "https://drive.google.com/demo-team"
      );
    });
  });

  it("opens a targeted reminder preview from the dashboard", async () => {
    const user = userEvent.setup();
    renderAt("/organizer/dashboard");
    await user.click(screen.getByRole("button", { name: /nhắc người chưa xong/i }));

    expect(screen.getByRole("dialog", { name: /nhắc riêng/i })).toBeInTheDocument();
    expect(screen.getByText(/người sẽ nhận nhắc/i)).toBeInTheDocument();
    expect(screen.getByText(/loại 27 người hoàn thành/i)).toBeInTheDocument();
  });
});
