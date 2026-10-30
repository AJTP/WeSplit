import { createBrowserRouter, Navigate, useParams } from "react-router";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { HomePage } from "./features/home/HomePage";
import { NotFoundPage } from "./features/NotFoundPage";
import { GroupsPage } from "./features/groups/GroupsPage";
import { NewGroupPage } from "./features/groups/NewGroupPage";
import { GroupLayout } from "./features/groups/GroupLayout";
import { GroupOverviewPage } from "./features/groups/GroupOverviewPage";
import { GroupSettingsPage } from "./features/groups/GroupSettingsPage";
import { MembersPage } from "./features/groups/MembersPage";
import { BalancesPage } from "./features/groups/BalancesPage";
import { PaymentsPage } from "./features/groups/PaymentsPage";
import { GroupExpensesPage } from "./features/expenses/GroupExpensesPage";
import { GroupExpenseFormPage } from "./features/expenses/GroupExpenseFormPage";
import { GroupExpenseDetailPage } from "./features/expenses/GroupExpenseDetailPage";
import { PersonalExpensesPage } from "./features/personal/PersonalExpensesPage";
import { PersonalExpenseFormPage } from "./features/personal/PersonalExpenseFormPage";
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { InvitePage } from "./features/invitations/InvitePage";
import { AccountPage } from "./features/account/AccountPage";
import { DevLoginPage } from "./features/dev/DevLoginPage";

// Una ruta de grupo desconocida vuelve al resumen de ese grupo.
function GroupFallback() {
  const { groupId } = useParams();
  return <Navigate to={`/groups/${groupId}`} replace />;
}

// Sesión de desarrollo sin Google. Con import.meta.env.DEV falso, Vite elimina esta ruta.
const devRoutes = import.meta.env.DEV ? [{ path: "/dev/login", element: <DevLoginPage /> }] : [];

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  ...devRoutes,
  { path: "/invite/:token", element: <InvitePage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: "groups", element: <GroupsPage /> },
      { path: "groups/new", element: <NewGroupPage /> },
      {
        path: "groups/:groupId",
        element: <GroupLayout />,
        children: [
          { index: true, element: <GroupOverviewPage /> },
          { path: "expenses", element: <GroupExpensesPage /> },
          { path: "expenses/new", element: <GroupExpenseFormPage /> },
          { path: "expenses/:expenseId", element: <GroupExpenseDetailPage /> },
          { path: "expenses/:expenseId/edit", element: <GroupExpenseFormPage /> },
          { path: "balances", element: <BalancesPage /> },
          { path: "payments", element: <PaymentsPage /> },
          { path: "members", element: <MembersPage /> },
          { path: "settings", element: <GroupSettingsPage /> },
          { path: "*", element: <GroupFallback /> },
        ],
      },
      { path: "expenses", element: <PersonalExpensesPage /> },
      { path: "expenses/new", element: <PersonalExpenseFormPage /> },
      { path: "expenses/:expenseId/edit", element: <PersonalExpenseFormPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
