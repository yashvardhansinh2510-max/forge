'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Badge } from '@forge/ui'
import { ProjectStatus, ProjectHealth } from '@forge/db'
import { Folder, Search, CheckCircle, Clock } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
    fetchProjects()
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects(search)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [search])

  const fetchDashboard = async () => {
    const res = await fetch('/api/projects/dashboard')
    if (res.ok) setDashboard(await res.json())
  }

  const fetchProjects = async (q = '') => {
    setLoading(true)
    const url = q ? `/api/projects?search=${encodeURIComponent(q)}` : '/api/projects'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects)
    }
    setLoading(false)
  }

  const getStatusColor = (status: ProjectStatus) => {
    const map: Record<ProjectStatus, string> = {
      LEAD: 'bg-gray-100 text-gray-800',
      QUOTED: 'bg-blue-100 text-blue-800',
      NEGOTIATION: 'bg-yellow-100 text-yellow-800',
      ORDERED: 'bg-purple-100 text-purple-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      DISPATCHED: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-red-100 text-red-800',
    }
    return map[status] || 'bg-gray-100 text-gray-800'
  }

  const getHealthColor = (health: ProjectHealth) => {
    const map: Record<ProjectHealth, string> = {
      GREEN: 'bg-emerald-500',
      YELLOW: 'bg-amber-500',
      RED: 'bg-rose-500',
    }
    return map[health] || 'bg-emerald-500'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <Button>New Project</Button>
      </div>

      {/* KPI Dashboard */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.activeProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.completedProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <span className="text-muted-foreground text-sm">₹</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{dashboard.pipelineValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects by name or client..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-muted-foreground">No projects found.</p>
        ) : (
          projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${getHealthColor(project.health)}`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg line-clamp-1">{project.projectName}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-1">{project.clientName}</p>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quotation Value:</span>
                      <span className="font-medium">₹{(project.quotationValue || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payments Received:</span>
                      <span className="font-medium text-green-600">₹{(project.paymentReceived || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outstanding:</span>
                      <span className="font-medium text-red-600">₹{(project.outstandingAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {project.activities && project.activities.length > 0 && (
                    <div className="mt-4 pt-4 border-t flex items-start gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                      <p className="line-clamp-1">
                        Last activity: {project.activities[0].description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
