#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QSystemTrayIcon>

class MyWebView;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(MyWebView *webView, QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void showAboutDialog();
    void trayIconActivated(QSystemTrayIcon::ActivationReason reason);
    void showWindow();
    void quitApp();

private:
    void setupMenuBar();
    void setupTrayIcon();

    MyWebView *m_webView;
    QSystemTrayIcon *m_trayIcon;
};

#endif // MAINWINDOW_H

