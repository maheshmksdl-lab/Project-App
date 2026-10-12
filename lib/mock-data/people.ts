import type { Person } from "@/lib/types/project";

/** The signed-in user. */
export const CURRENT_USER_ID = "usr-nikhil";

export const PEOPLE: Person[] = [
  { id: "usr-nikhil", name: "Nikhil V.", role: "Project Manager", avatar: "/avatars/con-ravi.jpg" },
  { id: "usr-mike", name: "Mike Johnson", role: "Finance Lead", avatar: "/avatars/con-michael.jpg" },
  { id: "usr-sarah", name: "Sarah Wilson", role: "Product Designer", avatar: "/avatars/agt-sarah.jpg" },
  { id: "usr-john", name: "John Doe", role: "Engineering Lead", avatar: "/avatars/con-jwilson.jpg" },
  { id: "usr-anna", name: "Anna Singh", role: "Business Analyst", avatar: "/avatars/con-priya.jpg" },
  { id: "usr-daniel", name: "Daniel Park", role: "Solutions Architect", avatar: "/avatars/agt-daniel.jpg" },
  { id: "usr-emma", name: "Emma Clarke", role: "QA Lead", avatar: "/avatars/agt-emma.jpg" },
  { id: "usr-marcus", name: "Marcus Lee", role: "Operations Manager", avatar: "/avatars/con-marcus.jpg" },
  { id: "usr-olivia", name: "Olivia Brown", role: "Marketing Manager", avatar: "/avatars/agt-olivia.jpg" },
  { id: "usr-james", name: "James Carter", role: "IT Manager", avatar: "/avatars/agt-james.jpg" },
  { id: "usr-grace", name: "Grace Kim", role: "HR Partner", avatar: "/avatars/con-grace.jpg" },
  { id: "usr-aaron", name: "Aaron Reed", role: "Developer", avatar: "/avatars/con-aaron.jpg" },
];

export const personById = (id: string) => PEOPLE.find((p) => p.id === id);
