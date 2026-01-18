#pragma once

#include <QObject>

class BackendObject : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString message READ message WRITE setMessage NOTIFY messageChanged)
    Q_PROPERTY(int count READ count WRITE setCount NOTIFY countChanged)
public:
    explicit BackendObject(QObject *parent = nullptr);

    QString message() const;
    void setMessage(const QString &msg);

    int count() const;
    void setCount(int count);

public slots:
    void sendToBackend(const QString &text);
    void incrementCount();

signals:
    void messageChanged(const QString &msg);
    void sendToFrontend(const QString &text);
    void countChanged(int count);

private:
    QString m_message;
    int m_count;
}; 