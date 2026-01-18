#ifndef MYWEBPAGE_H
#define MYWEBPAGE_H

#include <QWebEnginePage>
#include <QUrl>

class MyWebPage : public QWebEnginePage
{
    Q_OBJECT

public:
    explicit MyWebPage(QWebEngineProfile *profile, QObject *parent = nullptr);

protected:
    bool acceptNavigationRequest(const QUrl &url, NavigationType type, bool isMainFrame) override;
};

#endif // MYWEBPAGE_H 