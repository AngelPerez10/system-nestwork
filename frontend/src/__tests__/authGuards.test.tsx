import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Must mock AuthContext BEFORE importing components that use it
const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
  // Re-export types if needed - we only use the hook
}));

import RequireAuth from "../components/auth/RequireAuth";
import RequireAdmin from "../components/auth/RequireAdmin";
import RequireClientePermission from "../components/auth/RequireClientePermission";
import RequireCotizacionPermission from "../components/auth/RequireCotizacionPermission";
import RequireUsuariosView from "../components/auth/RequireUsuariosView";

interface MockAuthState {
  isAuthenticated?: boolean;
  isLoading?: boolean;
  role?: string | null;
  isSuperadmin?: boolean;
  isAdmin?: boolean;
  username?: string | null;
  email?: string | null;
  user?: Record<string, unknown> | null;
  permissions?: Record<string, unknown> | null;
  login?: () => Promise<void>;
  logout?: () => Promise<void>;
  refreshToken?: () => Promise<void>;
  hasPermission?: (module: string, action: string) => boolean;
}

function mockAuth(overrides: MockAuthState = {}) {
  mockUseAuth.mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    role: null,
    isSuperadmin: false,
    isAdmin: false,
    username: null,
    email: null,
    user: null,
    permissions: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    hasPermission: vi.fn(() => false),
    ...overrides,
  });
}

function renderWithRouter(ui: React.ReactElement, { route = "/" } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe("Auth Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RequireAuth", () => {
    it("shows loading spinner with accessible label", () => {
      mockAuth({ isLoading: true });

      renderWithRouter(
        <RequireAuth>
          <p>Protected</p>
        </RequireAuth>
      );

      const spinner = screen.getByRole("status");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute("aria-label", "Cargando autenticación");
      expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    });

    it("renders children when authenticated", () => {
      mockAuth({ isAuthenticated: true, isLoading: false });

      renderWithRouter(
        <RequireAuth>
          <p>Protected Content</p>
        </RequireAuth>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("RequireAdmin", () => {
    it("renders children for admin users", () => {
      mockAuth({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: true,
        role: "admin",
      });

      renderWithRouter(
        <RequireAdmin>
          <p>Admin Dashboard</p>
        </RequireAdmin>
      );

      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });

    it("spinner has accessible admin label", () => {
      mockAuth({ isLoading: true });

      renderWithRouter(
        <RequireAdmin>
          <p>Admin</p>
        </RequireAdmin>
      );

      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Verificando permisos de administrador"
      );
    });
  });

  describe("RequireClientePermission", () => {
    it("renders children for admin (bypasses permission check)", () => {
      mockAuth({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: true,
      });

      renderWithRouter(
        <RequireClientePermission required="view">
          <p>Clientes</p>
        </RequireClientePermission>
      );

      expect(screen.getByText("Clientes")).toBeInTheDocument();
    });
  });

  describe("RequireCotizacionPermission", () => {
    it("renders children for admin (bypasses permission check)", () => {
      mockAuth({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: true,
      });

      renderWithRouter(
        <RequireCotizacionPermission required="create">
          <p>Nueva Cotización</p>
        </RequireCotizacionPermission>
      );

      expect(screen.getByText("Nueva Cotización")).toBeInTheDocument();
    });
  });

  describe("RequireUsuariosView", () => {
    it("renders children for admin (bypasses permission check)", () => {
      mockAuth({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: true,
      });

      renderWithRouter(
        <RequireUsuariosView>
          <p>Usuarios</p>
        </RequireUsuariosView>
      );

      expect(screen.getByText("Usuarios")).toBeInTheDocument();
    });
  });
});
