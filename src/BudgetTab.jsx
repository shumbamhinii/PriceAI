import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Card,
    CardContent,
    Button,
    InputAdornment,
    Alert,
} from '@mui/material';
import { motion } from 'framer-motion';

const BudgetTab = ({ totalRevenue, calculatedProfit, loading }) => {
    const [clientBudget, setClientBudget] = useState(0);
    const [budgetStatus, setBudgetStatus] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('info');

    // Effect to recalculate budget status when totalRevenue or clientBudget changes
    useEffect(() => {
        if (clientBudget > 0 && totalRevenue > 0) {
            const difference = clientBudget - totalRevenue;
            if (difference >= 0) {
                setBudgetStatus(`The quotation total is within the client's budget! You have R${difference.toFixed(2)} remaining.`);
                setAlertSeverity('success');
            } else {
                setBudgetStatus(`The quotation total exceeds the client's budget by R${Math.abs(difference).toFixed(2)}. Consider adjusting prices or quantities.`);
                setAlertSeverity('error');
            }
        } else if (clientBudget > 0 && totalRevenue === 0) {
             setBudgetStatus("Enter product details and calculate prices to compare with the budget.");
             setAlertSeverity('info');
        } else {
            setBudgetStatus("Enter the client's budget above.");
            setAlertSeverity('info');
        }
    }, [clientBudget, totalRevenue]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', maxWidth: '800px' }}
        >
            <Card elevation={3} sx={{ mb: 4, width: '100%' }}>
                <CardContent>
                    <Typography variant="h5" align="center" gutterBottom sx={{ mb: 3, color: 'text.primary' }}>
                        Budget Analysis
                    </Typography>

                    <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
                        <TextField
                            label="Client's Budget (R)"
                            type="number"
                            value={clientBudget === 0 ? '' : clientBudget.toString().replace(/^0+/, '')}
                            onChange={(e) => setClientBudget(parseFloat(e.target.value) || 0)}
                            fullWidth
                            disabled={loading}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R</InputAdornment>,
                            }}
                            sx={{ maxWidth: '80%', mb: 2 }}
                        />

                        <Typography variant="h6" align="center" gutterBottom sx={{ color: 'text.primary' }}>
                            Quotation Total: R{totalRevenue.toFixed(2)}
                        </Typography>
                        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 2 }}>
                            Calculated Profit: R{calculatedProfit.toFixed(2)}
                        </Typography>

                        {budgetStatus && (
                            <Alert severity={alertSeverity} sx={{ width: '100%', maxWidth: '80%', mt: 2 }}>
                                {budgetStatus}
                            </Alert>
                        )}

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                            Use this tab to compare your calculated quotation's total revenue against a specific client budget.
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default BudgetTab;
