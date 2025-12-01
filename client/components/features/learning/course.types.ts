export interface CourseCardProps {
    course: {
        id: string;
        title: string;
        description: string;
        instructor: string;
        duration: number;
        level: 'beginner' | 'intermediate' | 'advanced';
        thumbnail?: string;
        enrolled: boolean;
        progress?: number;
    };
    onPress?: (id: string) => void;
    onEnroll?: (id: string) => void;
}

export interface CourseListProps {
    onCoursePress?: (id: string) => void;
}

export interface CourseDetailProps {
    courseId: string;
    onStartLesson?: (lessonId: string) => void;
    onBack?: () => void;
}

export interface LessonViewerProps {
    lessonId: string;
    onComplete?: (id: string) => void;
    onBack?: () => void;
}
