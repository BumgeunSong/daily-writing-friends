'use client'

import { useState } from 'react'
import { AlertCircle, Calendar, Plus, Trash2, RefreshCw } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useHolidayYears, useSaveHolidayYear, useDeleteHolidayYear } from '@/hooks/useHolidays'
import { Holiday } from '@/types/firestore'
import { toast } from 'sonner'

export default function HolidaysPage() {
  const { data: holidayYears = [], isLoading, error, refetch } = useHolidayYears()
  const saveMutation = useSaveHolidayYear()
  const deleteMutation = useDeleteHolidayYear()

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState<string>('')
  const [newHolidayName, setNewHolidayName] = useState<string>('')
  const [deletingHoliday, setDeletingHoliday] = useState<{ year: string; date: string } | null>(null)

  // Form validation
  const [validationError, setValidationError] = useState<string>('')

  // Open add dialog
  const handleAddNew = () => {
    setNewHolidayDate('')
    setNewHolidayName('')
    setValidationError('')
    setIsAddDialogOpen(true)
  }

  // Delete single holiday
  const handleDeleteHoliday = (year: string, date: string) => {
    setDeletingHoliday({ year, date })
    setIsDeleteDialogOpen(true)
  }

  // Add new holiday
  const handleAddHoliday = async () => {
    // Validate
    if (!newHolidayDate || !newHolidayName) {
      setValidationError('날짜와 이름을 모두 입력해주세요')
      return
    }

    // Check date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newHolidayDate)) {
      setValidationError('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)')
      return
    }

    // Extract year from date
    const year = newHolidayDate.split('-')[0]

    // Find or create year document
    const existingYearData = holidayYears.find(hy => hy.year === year)
    const newHoliday: Holiday = { date: newHolidayDate, name: newHolidayName }

    // Check for duplicate
    if (existingYearData?.items.some(h => h.date === newHolidayDate)) {
      setValidationError('해당 날짜의 공휴일이 이미 존재합니다')
      return
    }

    const updatedItems = existingYearData
      ? [...existingYearData.items, newHoliday].sort((a, b) => a.date.localeCompare(b.date))
      : [newHoliday]

    try {
      await saveMutation.mutateAsync({ year, items: updatedItems })
      toast.success('공휴일이 추가되었습니다')
      setIsAddDialogOpen(false)
      setNewHolidayDate('')
      setNewHolidayName('')
    } catch (error) {
      console.error('Error adding holiday:', error)
      toast.error('공휴일 추가 중 오류가 발생했습니다')
    }
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingHoliday) return

    const { year, date } = deletingHoliday
    const yearData = holidayYears.find(hy => hy.year === year)
    if (!yearData) return

    const updatedItems = yearData.items.filter(h => h.date !== date)

    try {
      if (updatedItems.length === 0) {
        // Delete entire year document if no holidays left
        await deleteMutation.mutateAsync(year)
        toast.success(`${year}년 공휴일 문서가 삭제되었습니다`)
      } else {
        // Update year document with remaining holidays
        await saveMutation.mutateAsync({ year, items: updatedItems })
        toast.success('공휴일이 삭제되었습니다')
      }
      setIsDeleteDialogOpen(false)
      setDeletingHoliday(null)
    } catch (error) {
      console.error('Error deleting holiday:', error)
      toast.error('공휴일 삭제 중 오류가 발생했습니다')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>공휴일 목록을 불러올 수 없습니다</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.'}
        </AlertDescription>
        <div className="mt-4">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">공휴일 관리</h1>
        <p className="text-muted-foreground">
          공휴일을 관리합니다. 설정된 공휴일은 기여도 그래프에서 회색으로 표시됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                공휴일 목록
              </CardTitle>
              <CardDescription>
                공휴일을 등록하고 관리할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              새 공휴일 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {holidayYears.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>등록된 공휴일이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>공휴일 이름</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidayYears.flatMap((holidayYear) =>
                  holidayYear.items.map((holiday) => (
                    <TableRow key={`${holidayYear.year}-${holiday.date}`}>
                      <TableCell className="font-medium">
                        {holiday.date}
                      </TableCell>
                      <TableCell>
                        {holiday.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteHoliday(holidayYear.year, holiday.date)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          삭제
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Holiday Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 공휴일 추가</DialogTitle>
            <DialogDescription>
              공휴일 날짜와 이름을 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">날짜</Label>
              <Input
                id="date"
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">공휴일 이름</Label>
              <Input
                id="name"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="신정"
              />
            </div>

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddHoliday} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공휴일 삭제</DialogTitle>
            <DialogDescription>
              {deletingHoliday && `${deletingHoliday.date} ${holidayYears.find(hy => hy.year === deletingHoliday.year)?.items.find(h => h.date === deletingHoliday.date)?.name || ''}`}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending || saveMutation.isPending}
            >
              {(deleteMutation.isPending || saveMutation.isPending) ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
