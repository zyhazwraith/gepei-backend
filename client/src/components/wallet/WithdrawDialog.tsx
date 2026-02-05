import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { applyWithdraw } from '../../lib/api';
import Price from "@/components/Price";

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  balance: number; // Unit: cents
}

export const WithdrawDialog: React.FC<WithdrawDialogProps> = ({
  open,
  onClose,
  onSuccess,
  balance
}) => {
  const [amount, setAmount] = useState<string>('');
  const [userNote, setUserNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    
    // Validation
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('请输入有效的提现金额');
      return;
    }
    
    const amountCents = Math.floor(amountVal * 100);
    if (amountCents > balance) {
      setError('余额不足');
      return;
    }
    
    if (!userNote.trim()) {
      setError('请填写收款信息');
      return;
    }

    setLoading(true);
    try {
      await applyWithdraw(amountCents, userNote);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || '提现申请失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setUserNote('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !loading && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>申请提现</DialogTitle>
          <DialogDescription>
            可提现金额: <Price amount={balance} />
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="amount">提现金额 (元)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">收款信息</Label>
            <Textarea
              id="note"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="请填写收款微信号，或银行卡号+姓名+开户行"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              我们会通过此信息进行线下打款，请务必准确填写
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            提交申请
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
