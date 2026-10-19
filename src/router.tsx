import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthLayout } from "./components/layout/AuthLayout";
import { SiteLayout } from "./components/layout/SiteLayout";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AdminRoute } from "./features/auth/AdminRoute";
import { AdminDashboardPage } from "./pages/AdminDashboard";
import { AboutDeveloperPage } from "./pages/AboutDeveloper";
import {
  AuthCallbackPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from "./pages/AuthRecovery";
import { CoursesPage } from "./pages/Courses";
import { CourseDetailsPage } from "./pages/CourseDetails";
import { DashboardPage } from "./pages/Dashboard";
import { DownloadAppPage } from "./pages/DownloadApp";
import { HomePage } from "./pages/Home";
import { LessonPage } from "./pages/Lesson";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { PackagesPage } from "./pages/Packages";
import { PlatformLandingPage } from "./pages/PlatformLandingPage";
import { ProfilePage } from "./pages/Profile";
import { QuizPage } from "./pages/Quiz";
import { RegisterPage } from "./pages/Register";
import { StudentOrdersPage } from "./pages/StudentOrders";
import { WindowsDownloadPage } from "./pages/WindowsDownload";
import { RootLayout } from "./components/layout/RootLayout";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <PlatformLandingPage /> },
      { path: "/about-developer", element: <AboutDeveloperPage /> },
      { path: "/download-app", element: <DownloadAppPage /> },
      { path: "/download-windows", element: <WindowsDownloadPage /> },
      {
        path: "/login",
        element: <AuthLayout />,
        children: [{ index: true, element: <LoginPage /> }],
      },
      {
        path: "/forgot-password",
        element: <AuthLayout />,
        children: [{ index: true, element: <ForgotPasswordPage /> }],
      },
      {
        path: "/reset-password",
        element: <AuthLayout />,
        children: [{ index: true, element: <ResetPasswordPage /> }],
      },
      {
        path: "/auth/callback",
        element: <AuthLayout />,
        children: [{ index: true, element: <AuthCallbackPage /> }],
      },
      {
        path: "/register",
        element: <AuthLayout />,
        children: [{ index: true, element: <RegisterPage /> }],
      },
      { path: "/courses/:courseId", element: <CourseDetailsPage /> },
      {
        path: "/courses",
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [{ index: true, element: <CoursesPage /> }],
          },
        ],
      },
      {
        path: "/packages",
        element: <AppShell />,
        children: [{ index: true, element: <PackagesPage /> }],
      },
      {
        path: "/dashboard",
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: "lesson/:lessonId", element: <LessonPage /> },
              { path: "quiz", element: <QuizPage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "orders", element: <StudentOrdersPage /> },
            ],
          },
        ],
      },
      {
        path: "/admin",
        element: <ProtectedRoute />,
        children: [
          {
            element: <AdminRoute />,
            children: [
              {
                element: <AppShell />,
                children: [{ index: true, element: <AdminDashboardPage /> }],
              },
            ],
          },
        ],
      },
      {
        path: "/home",
        element: <ProtectedRoute />,
        children: [
          {
            element: <SiteLayout />,
            children: [{ index: true, element: <HomePage /> }],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
