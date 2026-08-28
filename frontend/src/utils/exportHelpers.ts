import { Platform, Share, Alert } from "react-native";

/**
 * Trigger cross-platform CSV file download or share.
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  if (Platform.OS === "web") {
    try {
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Web CSV download error:", e);
      Alert.alert("Export Error", "Failed to trigger CSV download in browser.");
    }
  } else {
    try {
      Share.share({
        message: csvContent,
        title: filename,
      });
    } catch (e) {
      Alert.alert("Export Complete", `${filename} is ready.`);
    }
  }
}

/**
 * Open HTML financial receipt in browser print window or new tab.
 */
export function openPrintableReceipt(htmlContent: string): void {
  if (Platform.OS === "web") {
    try {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      }
    } catch (e) {
      console.error("Receipt window error:", e);
    }
  }
}
