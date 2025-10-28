-- Create electoral_processes table
CREATE TABLE IF NOT EXISTS electoral_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  member_type TEXT NOT NULL CHECK (member_type IN ('CPE', 'CDA')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES electoral_processes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('Supervisor', 'Revisor', 'Digitador', 'Archivador')),
  precinct TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(process_id, member_id)
);

-- Enable Row Level Security
ALTER TABLE electoral_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for electoral_processes
CREATE POLICY "Allow authenticated users to view processes"
  ON electoral_processes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert processes"
  ON electoral_processes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update processes"
  ON electoral_processes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete processes"
  ON electoral_processes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create policies for members
CREATE POLICY "Allow authenticated users to view members"
  ON members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert members"
  ON members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update members"
  ON members FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete members"
  ON members FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create policies for assignments
CREATE POLICY "Allow authenticated users to view assignments"
  ON assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert assignments"
  ON assignments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update assignments"
  ON assignments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete assignments"
  ON assignments FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_members_cedula ON members(cedula);
CREATE INDEX idx_members_type ON members(member_type);
CREATE INDEX idx_assignments_process ON assignments(process_id);
CREATE INDEX idx_assignments_member ON assignments(member_id);
CREATE INDEX idx_processes_dates ON electoral_processes(start_date, end_date);
