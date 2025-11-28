-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    instructor_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_courses_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for courses
CREATE INDEX IF NOT EXISTS idx_courses_tenant ON courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);
CREATE INDEX IF NOT EXISTS idx_courses_deleted_at ON courses(deleted_at);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('video', 'text', 'quiz')),
    content JSONB NOT NULL,
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    prerequisite_lesson_id INTEGER,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_lessons_prerequisite FOREIGN KEY (prerequisite_lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

-- Create indexes for lessons
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_prerequisite ON lessons(prerequisite_lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_deleted_at ON lessons(deleted_at);

-- Create lesson_completions table
CREATE TABLE IF NOT EXISTS lesson_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    grade DECIMAL(5,2) CHECK (grade >= 0 AND grade <= 100),
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_lesson_completions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_lesson_completions_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    CONSTRAINT uk_lesson_completion_user_lesson UNIQUE (user_id, lesson_id)
);

-- Create indexes for lesson_completions
CREATE INDEX IF NOT EXISTS idx_lesson_completion_lesson ON lesson_completions(lesson_id);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    average_grade DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (average_grade >= 0 AND average_grade <= 100),
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    certificate_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uk_enrollment_user_course UNIQUE (user_id, course_id)
);

-- Create indexes for enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_certificate ON enrollments(certificate_id);

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    verification_code VARCHAR(100) NOT NULL UNIQUE,
    certificate_url VARCHAR(500),
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_certificates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_certificates_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Create indexes for certificates
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_code ON certificates(verification_code);

-- Add foreign key constraint for enrollments.certificate_id (after certificates table exists)
ALTER TABLE enrollments 
ADD CONSTRAINT fk_enrollments_certificate 
FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE SET NULL;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_completions_updated_at BEFORE UPDATE ON lesson_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Learning courses created by instructors';
COMMENT ON TABLE lessons IS 'Individual lessons within courses with content and prerequisites';
COMMENT ON TABLE lesson_completions IS 'Tracks user progress and grades on lessons';
COMMENT ON TABLE enrollments IS 'Student enrollments in courses with progress tracking';
COMMENT ON TABLE certificates IS 'Certificates issued for completed courses with passing grades';

COMMENT ON COLUMN courses.difficulty IS 'Course difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN courses.price IS 'Course price in USD, 0 for free courses';
COMMENT ON COLUMN courses.published IS 'Whether course is published and available for enrollment';

COMMENT ON COLUMN lessons.content_type IS 'Lesson content type: video, text, or quiz';
COMMENT ON COLUMN lessons.content IS 'JSONB content structure varies by content_type';
COMMENT ON COLUMN lessons.order_index IS 'Display order within course (0-based)';
COMMENT ON COLUMN lessons.prerequisite_lesson_id IS 'Lesson that must be completed first';

COMMENT ON COLUMN lesson_completions.grade IS 'Grade percentage (0-100) for graded lessons, null for non-graded';

COMMENT ON COLUMN enrollments.completion_percentage IS 'Percentage of lessons completed (0-100)';
COMMENT ON COLUMN enrollments.average_grade IS 'Average grade across all graded lessons (0-100)';

COMMENT ON COLUMN certificates.verification_code IS 'Unique code for public certificate verification';
COMMENT ON COLUMN certificates.certificate_url IS 'URL to generated PDF certificate';
