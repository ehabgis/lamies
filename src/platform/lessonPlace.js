import { useLocation } from "react-router-dom";

// The three bundled lessons of «كنوز مصر» open in two places, with the same
// content and activities:
// - /demo/…      the visitor's sample: nothing is saved to an account;
// - /classroom/… a signed-in student's published lesson: results go to the
//                account (the server checks publication and enrolment).
// A page and its API calls follow the place it was opened from.
export function lessonPlace(pathname = "") {
  const classroom = pathname.startsWith("/classroom/");
  return {
    classroom,
    page: classroom ? "/classroom" : "/demo",
    api: classroom ? "/lessons" : "/demo/lessons",
  };
}

export function useLessonPlace() {
  return lessonPlace(useLocation().pathname);
}
