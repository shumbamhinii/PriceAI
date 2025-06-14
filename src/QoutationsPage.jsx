import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './QuotationsPage.module.css';

const LOCAL_STORAGE_SNAPSHOT_KEY = 'activeQuotationsSnapshot';

const QuotationsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // States for quotation data
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [validUntil, setValidUntil] = useState('');

    // State for products available for selection from the active snapshot
    const [availableForSelectionProducts, setAvailableForSelectionProducts] = useState([]);
    // State for products explicitly added to the current quote by the user
    const [quotedProducts, setQuotedProducts] = useState([]);

    const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('');

    const [designCost, setDesignCost] = useState(0);
    const [sampleCost, setSampleCost] = useState(0);
    const [handlingCost, setHandlingCost] = useState(0);
    const [showTerms, setShowTerms] = useState(true);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // State to explicitly track the active snapshot's name for display
    const [currentActiveSnapshotName, setCurrentActiveSnapshotName] = useState('');

    // Effect to load or save snapshot data from/to localStorage
    useEffect(() => {
        let snapshotProductsToUse = [];
        let snapshotNameToUse = '';

        // 1. Check location.state first (highest priority: new navigation from manager)
        if (location.state && location.state.products && location.state.snapshotName) {
            snapshotProductsToUse = location.state.products;
            snapshotNameToUse = location.state.snapshotName;
            // Save to localStorage
            localStorage.setItem(LOCAL_STORAGE_SNAPSHOT_KEY, JSON.stringify({
                products: snapshotProductsToUse,
                name: snapshotNameToUse
            }));
            // Clear location state to prevent re-triggering on subsequent renders if not new navigation
            window.history.replaceState({}, document.title); // Clears the state without adding a new history entry
        } else {
            // 2. If no new state, try to load from localStorage
            const storedSnapshot = localStorage.getItem(LOCAL_STORAGE_SNAPSHOT_KEY);
            if (storedSnapshot) {
                try {
                    const parsedSnapshot = JSON.parse(storedSnapshot);
                    if (parsedSnapshot.products && parsedSnapshot.name) {
                        snapshotProductsToUse = parsedSnapshot.products;
                        snapshotNameToUse = parsedSnapshot.name;
                    }
                } catch (error) {
                    console.error("Error parsing stored snapshot from localStorage:", error);
                    localStorage.removeItem(LOCAL_STORAGE_SNAPSHOT_KEY); // Clear corrupt data
                }
            }
        }

        // Initialize available products for selection and quoted products based on the determined source
        setCurrentActiveSnapshotName(snapshotNameToUse);
        setAvailableForSelectionProducts(snapshotProductsToUse.map(product => ({
            ...product,
            id: product.id || `snap-${Math.random().toString(36).substr(2, 9)}`, // Ensure unique ID
            sellingPrice: product.price || product.suggestedPrice || 0,
            supplierCost: product.cost_per_unit || 0,
            quantity: product.expected_units || product.minQuantity || 1,
            notes: product.notes || 'Product from snapshot.'
        })));
        // Do NOT automatically set quotedProducts here unless you want ALL snapshot products
        // to be pre-selected in the quote on load. User will add via dropdown.
        setQuotedProducts([]); // Always start with an empty quote when loading a new or persisted snapshot.

    }, [location.state]); // Dependency on location.state ensures this runs when navigation state changes

    // Handlers
    const handleAddProductToQuote = useCallback(() => {
        if (!selectedProductIdToAdd) return;

        const productToAdd = availableForSelectionProducts.find(p => p.id === selectedProductIdToAdd);

        if (productToAdd) {
            if (quotedProducts.some(p => p.originalId === productToAdd.id)) {
                alert(`"${productToAdd.name}" is already in your quote.`);
                return;
            }

            setQuotedProducts(prevProducts => [
                ...prevProducts,
                {
                    ...productToAdd,
                    quoteId: Date.now() + Math.random(), // Unique ID for this specific quote item
                    originalId: productToAdd.id, // Keep track of the original product ID
                    quantity: productToAdd.quantity || 1, // Use default quantity from snapshot product
                }
            ]);
            setSelectedProductIdToAdd(''); // Reset dropdown
        }
    }, [selectedProductIdToAdd, availableForSelectionProducts, quotedProducts]);

    const updateQuotedProduct = useCallback((quoteId, field, value) => {
        setQuotedProducts(prevProducts =>
            prevProducts.map(product =>
                product.quoteId === quoteId ? { ...product, [field]: value } : product
            )
        );
    }, []);

    const removeQuotedProduct = useCallback((quoteId) => {
        setQuotedProducts(prevProducts => prevProducts.filter(product => product.quoteId !== quoteId));
    }, []);

    const calculateLineItemTotal = useCallback((product) => {
        return product.sellingPrice * product.quantity;
    }, []);

    const calculateGrandTotal = useCallback(() => {
        const productsTotal = quotedProducts.reduce((sum, product) => sum + calculateLineItemTotal(product), 0);
        return productsTotal + designCost + sampleCost + handlingCost;
    }, [quotedProducts, calculateLineItemTotal, designCost, sampleCost, handlingCost]);

    const clearStoredSnapshot = useCallback(() => {
        localStorage.removeItem(LOCAL_STORAGE_SNAPSHOT_KEY);
        setCurrentActiveSnapshotName('');
        setAvailableForSelectionProducts([]);
        setQuotedProducts([]); // Clear current quote
        setSelectedProductIdToAdd(''); // Reset dropdown
        alert("Stored snapshot cleared. You can now select a new one or start fresh.");
    }, []);

    const resetForm = useCallback(() => {
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setQuoteDate(new Date().toISOString().split('T')[0]);
        setValidUntil('');
        setQuotedProducts([]); // Clear selected products for the current quote
        setSelectedProductIdToAdd(''); // Clears dropdown selection
        setDesignCost(0);
        setSampleCost(0);
        setHandlingCost(0);
        setShowTerms(true);
        setTermsAccepted(false);
        // Do NOT clear localStorage here unless explicitly desired.
        // The clearStoredSnapshot button handles that.
    }, []);

    const generateQuotationContent = useCallback(() => {
        let content = `
            <style>
                body { font-family: 'Inter', sans-serif; margin: 20px; color: #333; }
                h1, h2, h3, h4 { color: #5a5a5a; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;}
                h1 { text-align: center; font-size: 2.5em; color: #CC7722; } /* Main title accent color */
                h2 { font-size: 1.8em; }
                h3 { font-size: 1.4em; }
                p { margin-bottom: 10px; line-height: 1.5; }
                strong { font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; }
                th { background-color: #f2f2f2; font-weight: bold; color: #555; }
                td { background-color: #ffffff; }
                .total { font-weight: bold; font-size: 1.2em; color: #CC7722; } /* Total accent color */
                hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
                .note { font-style: italic; color: #777; font-size: 0.9em; }
                .terms { background-color: #f8f8f8; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-top: 20px; }
            </style>
            <h1>Tshepiso Branding Quotation</h1>
            <p><strong>Date:</strong> ${quoteDate}</p>
            ${validUntil ? `<p><strong>Valid Until:</strong> ${validUntil}</p>` : ''}
            <hr/>
            <h2>Client Details</h2>
            <p><strong>Customer Name:</strong> ${customerName || 'N/A'}</p>
            <p><strong>Customer Email:</strong> ${customerEmail || 'N/A'}</p>
            <p><strong>Customer Phone:</strong> ${customerPhone || 'N/A'}</p>
        `;

        if (currentActiveSnapshotName) {
            content += `
                <hr/>
                <h2>Snapshot Details</h2>
                <p><strong>Snapshot Used:</strong> ${currentActiveSnapshotName}</p>
            `;
        }

        content += `
            <hr/>
            <h2>Quotation Items</h2>
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Supplier Cost (R)</th>
                        <th>Quantity</th>
                        <th>Selling Price Per Unit (R)</th>
                        <th>Line Total (R)</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (quotedProducts.length === 0) {
            content += `<tr><td colspan="6" style="text-align: center; color: #888;">No products selected for this quotation.</td></tr>`;
        } else {
            quotedProducts.forEach(product => {
                const lineTotal = calculateLineItemTotal(product);
                content += `
                    <tr>
                        <td>${product.name}</td>
                        <td>R ${product.supplierCost.toFixed(2)}</td>
                        <td>${product.quantity}</td>
                        <td>R ${product.sellingPrice.toFixed(2)}</td>
                        <td>R ${lineTotal.toFixed(2)}</td>
                        <td><span class="note">${product.notes || 'N/A'}</span></td>
                    </tr>
                `;
            });
        }

        content += `
                </tbody>
            </table>
        `;

        if (designCost > 0 || sampleCost > 0 || handlingCost > 0) {
            content += `
                <hr/>
                <h2>Additional Project Costs</h2>
                ${designCost > 0 ? `<p>Graphic Design Cost: R ${designCost.toFixed(2)}</p>` : ''}
                ${sampleCost > 0 ? `<p>Sample Cost: R ${sampleCost.toFixed(2)}</p>` : ''}
                ${handlingCost > 0 ? `<p>Sample Handling Cost: R ${handlingCost.toFixed(2)}</p>` : ''}
            `;
        }

        content += `
            <hr/>
            <h2>Summary</h2>
            <p class="total"><strong>Total Products Value:</strong> R ${quotedProducts.reduce((sum, product) => sum + calculateLineItemTotal(product), 0).toFixed(2)}</p>
            <p class="total"><strong>Total Additional Costs:</strong> R ${(designCost + sampleCost + handlingCost).toFixed(2)}</p>
            <p class="total" style="font-size: 1.5em; color: #CC7722;"><strong>GRAND TOTAL:</strong> R ${calculateGrandTotal().toFixed(2)}</p>
        `;

        if (showTerms && termsAccepted) {
            content += `
                <div class="terms">
                    <h2>Terms and Conditions</h2>
                    <p>This quotation is valid for 30 days from the date of issue. All prices are in ZAR (South African Rand) and are subject to change based on material costs and supplier availability.</p>
                    <p>A 50% deposit is required upon acceptance of this quotation, with the remaining 50% due upon delivery/completion. Lead times will be confirmed upon receipt of deposit.</p>
                    <p>Custom designs and specific material requirements may incur additional costs. Cancellation of orders after deposit payment may result in forfeiture of the deposit, depending on the stage of production. Any changes to quantities or specifications after acceptance may require a revised quotation.</p>
                    <p>Errors and omissions excepted (E&OE).</p>
                    <p>For any queries, please contact Tshepiso Branding at info@tshepi-branding.com or +27 123 456 789.</p>
                </div>
            `;
        }

        return content;
    }, [quoteDate, validUntil, customerName, customerEmail, customerPhone, currentActiveSnapshotName, quotedProducts, calculateLineItemTotal, designCost, sampleCost, handlingCost, calculateGrandTotal, showTerms, termsAccepted]);


    return (
        <div className={styles.quotationsPage}>
            <button onClick={() => navigate(-1)} className={styles.backButton}>
                &larr; Back
            </button>
            <h1 className={styles.pageTitle}>Generate New Quotation</h1>

            <div className={styles.formSection}>
                {/* Client Information */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Client Information</h3>
                    <div className={styles.inputGroup}>
                        <label htmlFor="customerName" className={styles.label}>Customer Name:</label>
                        <input
                            type="text"
                            id="customerName"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className={styles.input}
                            placeholder="e.g., John Doe"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="customerEmail" className={styles.label}>Customer Email:</label>
                        <input
                            type="email"
                            id="customerEmail"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className={styles.input}
                            placeholder="e.g., john.doe@example.com"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="customerPhone" className={styles.label}>Customer Phone:</label>
                        <input
                            type="tel"
                            id="customerPhone"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className={styles.input}
                            placeholder="e.g., +27 12 345 6789"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="quoteDate" className={styles.label}>Quotation Date:</label>
                        <input
                            type="date"
                            id="quoteDate"
                            value={quoteDate}
                            onChange={(e) => setQuoteDate(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="validUntil" className={styles.label}>Valid Until (Optional):</label>
                        <input
                            type="date"
                            id="validUntil"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                            className={styles.input}
                        />
                        <p className={styles.inputHelperText}>
                            Set an expiration date for this quotation.
                        </p>
                    </div>
                </div>

                {/* Snapshot Information & Clear Button */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Active Product Snapshot</h3>
                    {currentActiveSnapshotName ? (
                        <>
                            <p className={styles.snapshotInfo}>
                                Products loaded from: <strong>{currentActiveSnapshotName}</strong>
                            </p>
                            <button
                                onClick={clearStoredSnapshot}
                                className={styles.secondaryButton}
                                style={{ width: '100%', marginTop: '15px' }}
                            >
                                Clear Stored Snapshot
                            </button>
                            <p className={styles.inputHelperText} style={{ textAlign: 'center', marginTop: '10px' }}>
                                Use this to select a *new* snapshot from the Snapshot Manager.
                            </p>
                        </>
                    ) : (
                        <p className={styles.csvEmptyState}>
                            No active snapshot loaded. Please navigate from the Snapshot Management page to load products from a specific snapshot, or it might have been cleared.
                        </p>
                    )}
                </div>

                {/* Select Products from Snapshot */}
                <div className={`${styles.card} ${styles.fullWidthCard}`}>
                    <h3 className={styles.cardTitle}>Select Products for Quote</h3>
                    {availableForSelectionProducts.length === 0 ? (
                        <p className={styles.csvEmptyState}>
                            No products available from the active snapshot for selection.
                            Please ensure a snapshot is loaded and has products.
                        </p>
                    ) : (
                        <div className={styles.inputGroup}>
                            <label htmlFor="productSelect" className={styles.label}>Choose a Product:</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    id="productSelect"
                                    className={styles.select}
                                    onChange={(e) => setSelectedProductIdToAdd(e.target.value)}
                                    value={selectedProductIdToAdd}
                                >
                                    <option value="">-- Select a Product --</option>
                                    {availableForSelectionProducts.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} (R {product.sellingPrice?.toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAddProductToQuote}
                                    className={styles.primaryButton}
                                    disabled={!selectedProductIdToAdd}
                                    style={{ flexShrink: 0 }}
                                >
                                    Add
                                </button>
                            </div>
                            <p className={styles.inputHelperText}>
                                Select products from the loaded snapshot to add them to your quotation below.
                            </p>
                        </div>
                    )}
                </div>

                {/* Adjust Quotation Items - now only for selected products */}
                <div className={`${styles.card} ${styles.fullWidthCard}`}>
                    <h3 className={styles.cardTitle}>Current Quotation Items</h3>
                    {quotedProducts.length === 0 ? (
                        <p className={styles.csvEmptyState}>No products currently added to this quote. Please select from the dropdown above.</p>
                    ) : (
                        <div className={styles.quotationItemsContainer}>
                            {quotedProducts.map(product => (
                                <div key={product.quoteId} className={styles.productInputGroup}>
                                    <h5 className={styles.productGroupTitle}>{product.name}</h5>
                                    {product.notes && (
                                        <p className={styles.inputHelperText} style={{ textAlign: 'center', fontStyle: 'italic', color: '#888' }}>
                                            Note: {product.notes}
                                        </p>
                                    )}

                                    {/* Selling Price from Snapshot - Read-only */}
                                    <label className={styles.label}>Selling Price Per Unit (R)</label>
                                    <input
                                        type="number"
                                        value={product.sellingPrice.toFixed(2)}
                                        className={styles.input}
                                        readOnly
                                        disabled
                                        style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                                    />
                                    <p className={styles.inputHelperText}>
                                        Price is determined by the active snapshot.
                                    </p>

                                    <label className={styles.label}>Quantity</label>
                                    <input
                                        type="number"
                                        value={product.quantity}
                                        onChange={(e) => updateQuotedProduct(product.quoteId, 'quantity', Number(e.target.value))}
                                        className={styles.input}
                                        min={product.minQuantity || 1}
                                        max={product.maxQuantity || undefined}
                                        placeholder={`Min: ${product.minQuantity || 1}`}
                                    />
                                    {product.minQuantity && product.quantity < product.minQuantity && (
                                        <p className={styles.insightText} style={{ color: '#dc3545' }}>
                                            Quantity must be at least {product.minQuantity} units.
                                        </p>
                                    )}
                                    {product.maxQuantity && product.quantity > product.maxQuantity && (
                                        <p className={styles.insightText} style={{ color: '#dc3545' }}>
                                            Quantity cannot exceed {product.maxQuantity} units.
                                        </p>
                                    )}

                                    <div className={styles.metricCardNoBorder}>
                                        <div className={styles.metricItem}>
                                            <span className={styles.metricLabel}>Line Total:</span>
                                            <span className={styles.metricValue}>
                                                R {calculateLineItemTotal(product).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeQuotedProduct(product.quoteId)}
                                        className={styles.removeProductButton}
                                    >
                                        Remove Product
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Additional Costs */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Additional Project Costs</h3>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Graphic Design Cost (R):</label>
                        <input
                            type="number"
                            value={designCost}
                            onChange={(e) => setDesignCost(Number(e.target.value))}
                            className={styles.input}
                            min="0"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Sample Cost (R):</label>
                        <input
                            type="number"
                            value={sampleCost}
                            onChange={(e) => setSampleCost(Number(e.target.value))}
                            className={styles.input}
                            min="0"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Sample Handling Cost (R):</label>
                        <input
                            type="number"
                            value={handlingCost}
                            onChange={(e) => setHandlingCost(Number(e.target.value))}
                            className={styles.input}
                            min="0"
                        />
                    </div>
                </div>

                {/* Totals */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Summary</h3>
                    <div className={styles.metricCard}>
                        <div className={styles.metricItem}>
                            <span className={styles.metricLabel}>Total Products Value:</span>
                            <span className={styles.metricValue}>R {quotedProducts.reduce((sum, product) => sum + calculateLineItemTotal(product), 0).toFixed(2)}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricLabel}>Total Additional Costs:</span>
                            <span className={styles.metricValue}>R ${(designCost + sampleCost + handlingCost).toFixed(2)}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricLabel}>Grand Total:</span>
                            <span className={styles.metricValuePrimary}>R {calculateGrandTotal().toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div className={`${styles.card} ${styles.fullWidthCard}`}>
                    <h3 className={styles.cardTitle}>Terms and Conditions</h3>
                    <div className={styles.termsToggle}>
                        <input
                            type="checkbox"
                            id="showTerms"
                            checked={showTerms}
                            onChange={() => setShowTerms(!showTerms)}
                        />
                        <label htmlFor="showTerms">Show Terms and Conditions</label>
                    </div>
                    {showTerms && (
                        <div id="termsContentDiv" className={styles.termsContent}>
                            <p>
                                This quotation is valid for 30 days from the date of issue. All prices are in ZAR (South African Rand)
                                and are subject to change based on material costs and supplier availability.
                            </p>
                            <p>
                                A 50% deposit is required upon acceptance of this quotation, with the remaining 50% due upon delivery/completion.
                                Lead times will be confirmed upon receipt of deposit.
                            </p>
                            <p>
                                Custom designs and specific material requirements may incur additional costs.
                                Cancellation of orders after deposit payment may result in forfeiture of the deposit, depending on the stage of production.
                                Any changes to quantities or specifications after acceptance may require a revised quotation.
                            </p>
                            <p>Errors and omissions excepted (E&OE).</p>
                            <p>For any queries, please contact Tshepiso Branding at info@tshepi-branding.com or +27 123 456 789.</p>
                            <div className={styles.termsAcceptance}>
                                <input
                                    type="checkbox"
                                    id="termsAccepted"
                                    checked={termsAccepted}
                                    onChange={() => setTermsAccepted(!termsAccepted)}
                                />
                                <label htmlFor="termsAccepted">I have read and agree to the Terms and Conditions</label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={`${styles.buttonGroup} ${styles.fullWidthCard}`}>
                    <button
                        onClick={() => {
                            if (!customerName || !customerEmail || quotedProducts.length === 0) {
                                alert("Please fill in Customer Name, Email, and add at least one product before generating the quotation.");
                                return;
                            }
                            if (termsAccepted) {
                                const printWindow = window.open('', '_blank');
                                printWindow.document.write('<html><head><title>Quotation</title>');
                                printWindow.document.write(generateQuotationContent());
                                printWindow.document.write('</body></html>');
                                printWindow.document.close();
                                printWindow.print();
                            } else {
                                alert("Please accept the terms and conditions to generate the quotation.");
                            }
                        }}
                        className={styles.primaryButton}
                        disabled={!termsAccepted || quotedProducts.length === 0 || !customerName || !customerEmail}
                    >
                        Generate and Print Quotation
                    </button>
                    <button
                        onClick={resetForm}
                        className={styles.secondaryButton}
                    >
                        Reset Quotation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationsPage;
