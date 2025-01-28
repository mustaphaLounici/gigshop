export type UserRole = 'admin' | 'job_poster' | 'freelancer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  skills?: string[];
  rating?: number;
  completedGigs?: number;
}

export type GigStatus = 'open' | 'assigned' | 'in-progress' | 'in-review' | 'completed';
export type GigPriority = 'low' | 'medium' | 'high';

export interface Gig {
  id: string;
  title: string;
  description: string;
  status: GigStatus;
  priority: GigPriority;
  posterId: string;
  assignedTo?: string;
  budget: number;
  deadline: string;
  skills: string[];
  progress?: number;
  milestones?: Milestone[];
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface GigApplication {
  id: string;
  gigId: string;
  freelancerId: string;
  coverLetter: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface GigMetrics {
  totalGigs: number;
  completedGigs: number;
  totalEarnings: number;
  averageRating: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'application' | 'status_update' | 'comment' | 'milestone';
  message: string;
  read: boolean;
  createdAt: string;
} 