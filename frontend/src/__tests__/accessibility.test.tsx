import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    role: "tecnico",
    isSuperadmin: false,
    isAdmin: false,
    username: "testuser",
    email: "test@example.com",
    user: { id: 1, username: "testuser" },
    permissions: { tareas: { view: true }, clientes: { view: true }, ordenes: { view: true } },
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    hasPermission: vi.fn(() => false),
  }),
}));

vi.mock("@/context/SidebarContext", () => ({
  useSidebar: () => ({
    isExpanded: true,
    isHovered: false,
    isMobileOpen: false,
    toggleSidebar: vi.fn(),
    toggleMobileSidebar: vi.fn(),
  }),
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/config/api", () => ({
  apiUrl: (path: string) => `http://localhost:8000${path}`,
  getAuthHeaders: () => ({}),
}));

import SkipLink from "../components/common/SkipLink";
import ErrorBoundary from "../components/common/ErrorBoundary";
import Alert from "../components/ui/alert/Alert";

describe("Accessibility audits (axe-core)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SkipLink has no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <SkipLink />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ErrorBoundary fallback has no accessibility violations", async () => {
    const ProblematicChild = () => {
      throw new Error("Test error");
    };

    const { container } = render(
      <MemoryRouter>
        <ErrorBoundary>
          <ProblematicChild />
        </ErrorBoundary>
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Alert success variant has no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <Alert variant="success" title="Éxito" message="Operación completada" />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Alert error variant has no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <Alert variant="error" title="Error" message="Algo salió mal" />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Alert warning variant has no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <Alert variant="warning" title="Advertencia" message="Ten cuidado" />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Alert info variant has no accessibility violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <Alert variant="info" title="Información" message="Dato relevante" />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
